package co.median.android;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.util.Base64;
import android.webkit.JavascriptInterface;

import androidx.documentfile.provider.DocumentFile;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

/** Native Storage Access Framework bridge used by the VS Code web app on Android WebView. */
public final class AndroidDirectoryPickerBridge {
    public static final int REQUEST_SELECT_DIRECTORY = 901;

    private final MainActivity activity;
    private String pendingPickerCallback;

    public AndroidDirectoryPickerBridge(MainActivity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public synchronized void pickDirectory(String callback) {
        pendingPickerCallback = callback;
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
                | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
        try {
            activity.startActivityForResult(intent, REQUEST_SELECT_DIRECTORY);
        } catch (Exception e) {
            pendingPickerCallback = null;
            invoke(callback, JSONObject.NULL);
        }
    }

    public synchronized boolean handleActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != REQUEST_SELECT_DIRECTORY) return false;
        final String callback = pendingPickerCallback;
        pendingPickerCallback = null;
        if (resultCode != MainActivity.RESULT_OK || data == null || data.getData() == null) {
            invoke(callback, JSONObject.NULL);
            return true;
        }
        Uri treeUri = data.getData();
        try {
            int takeFlags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            activity.getContentResolver().takePersistableUriPermission(treeUri, takeFlags);
        } catch (Exception ignored) {
            // Some Quest file providers do not expose persistable permissions; the active URI still works.
        }
        DocumentFile root = DocumentFile.fromTreeUri(activity, treeUri);
        try {
            JSONObject result = new JSONObject();
            result.put("uri", treeUri.toString());
            result.put("name", root != null && root.getName() != null ? root.getName() : "Selected folder");
            invoke(callback, result);
        } catch (Exception e) {
            invoke(callback, JSONObject.NULL);
        }
        return true;
    }

    @JavascriptInterface
    public void listDirectory(final String uriString, final String callback) {
        new Thread(() -> {
            JSONArray result = new JSONArray();
            try {
                Uri treeUri = Uri.parse(uriString);
                String documentId = DocumentsContract.getTreeDocumentId(treeUri);
                Uri childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, documentId);
                String[] projection = new String[]{
                        DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                        DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                        DocumentsContract.Document.COLUMN_MIME_TYPE,
                        DocumentsContract.Document.COLUMN_SIZE,
                        DocumentsContract.Document.COLUMN_LAST_MODIFIED
                };
                try (Cursor cursor = activity.getContentResolver().query(childrenUri, projection, null, null, null)) {
                    if (cursor != null) {
                        int idCol = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_DOCUMENT_ID);
                        int nameCol = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_DISPLAY_NAME);
                        int mimeCol = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_MIME_TYPE);
                        int sizeCol = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_SIZE);
                        int modifiedCol = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_LAST_MODIFIED);
                        while (cursor.moveToNext()) {
                            String id = cursor.getString(idCol);
                            String name = cursor.getString(nameCol);
                            String mime = cursor.getString(mimeCol);
                            JSONObject entry = new JSONObject();
                            entry.put("name", name == null ? "" : name);
                            entry.put("kind", DocumentsContract.Document.MIME_TYPE_DIR.equals(mime) ? "directory" : "file");
                            entry.put("uri", DocumentsContract.buildDocumentUriUsingTree(treeUri, id).toString());
                            entry.put("size", sizeCol >= 0 && !cursor.isNull(sizeCol) ? cursor.getLong(sizeCol) : 0);
                            entry.put("lastModified", modifiedCol >= 0 && !cursor.isNull(modifiedCol) ? cursor.getLong(modifiedCol) : 0);
                            result.put(entry);
                        }
                    }
                }
            } catch (Exception ignored) {
            }
            invoke(callback, result);
        }, "android-directory-list").start();
    }

    @JavascriptInterface
    public void readFile(final String uriString, final String callback) {
        new Thread(() -> {
            JSONObject result = new JSONObject();
            try (InputStream input = activity.getContentResolver().openInputStream(Uri.parse(uriString));
                 ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                if (input == null) throw new IllegalStateException("Unable to open file");
                byte[] buffer = new byte[64 * 1024];
                int count;
                while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                result.put("data", Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP));
                result.put("ok", true);
            } catch (Exception e) {
                try { result.put("ok", false).put("error", e.getMessage() == null ? "Unable to read file" : e.getMessage()); }
                catch (Exception ignored) { }
            }
            invoke(callback, result);
        }, "android-directory-read").start();
    }

    @JavascriptInterface
    public void writeFile(final String uriString, final String base64, final String callback) {
        new Thread(() -> {
            boolean ok = false;
            try (OutputStream output = activity.getContentResolver().openOutputStream(Uri.parse(uriString), "wt")) {
                if (output == null) throw new IllegalStateException("Unable to open file for writing");
                output.write(Base64.decode(base64, Base64.DEFAULT));
                ok = true;
            } catch (Exception ignored) { }
            invoke(callback, Boolean.valueOf(ok));
        }, "android-directory-write").start();
    }

    private void invoke(final String callback, final Object value) {
        if (callback == null || callback.isEmpty()) return;
        final String json = value == null ? "null" : value.toString();
        activity.runOnUiThread(() -> activity.runJavascript("window[" + JSONObject.quote(callback) + "](" + json + ");"));
    }
}

// End of file
