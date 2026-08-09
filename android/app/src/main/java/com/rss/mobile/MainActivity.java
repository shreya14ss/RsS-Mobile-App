package com.rss.mobile;

import android.net.http.SslCertificate;
import android.net.http.SslError;
import android.os.Bundle;
import android.util.Log;
import android.webkit.SslErrorHandler;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

import java.io.InputStream;
import java.lang.reflect.Field;
import java.security.MessageDigest;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "RsSCertPin";
    private final Set<String> pinnedFingerprints = new HashSet<>();
    private final Map<String, String> pinNames = new HashMap<>();

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        loadPinnedCerts();
        this.bridge.getWebView().setWebViewClient(
            new BridgeWebViewClient(this.bridge) {
                @Override
                public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                    checkPinAndProceed(handler, error);
                }
            }
        );
    }

    private void checkPinAndProceed(SslErrorHandler handler, SslError error) {
        try {
            SslCertificate sslCert = error.getCertificate();
            Bundle bundle = SslCertificate.saveState(sslCert);
            byte[] certBytes = bundle.getByteArray("x509-certificate");
            if (certBytes == null) {
                Log.w(TAG, "No X.509 bytes on SSL cert; rejecting " + error.getUrl());
                handler.cancel();
                return;
            }
            String fp = sha256Hex(certBytes);
            if (pinnedFingerprints.contains(fp)) {
                String name = pinNames.containsKey(fp) ? pinNames.get(fp) : "?";
                Log.i(TAG, "SSL cert PIN match (" + name + "), proceeding: " + error.getUrl());
                handler.proceed();
            } else {
                Log.w(TAG, "SSL cert NOT pinned (server sha256=" + fp + "). Rejecting " + error.getUrl());
                handler.cancel();
            }
        } catch (Exception e) {
            Log.e(TAG, "Pin check error: " + e.getMessage());
            handler.cancel();
        }
    }

    private void loadPinnedCerts() {
        try {
            Class<?> rawClass = Class.forName(getPackageName() + ".R$raw");
            CertificateFactory cf = CertificateFactory.getInstance("X.509");
            for (Field f : rawClass.getFields()) {
                int resId;
                try {
                    resId = f.getInt(null);
                } catch (Exception e) {
                    continue;
                }
                InputStream is = null;
                try {
                    is = getResources().openRawResource(resId);
                    X509Certificate cert = (X509Certificate) cf.generateCertificate(is);
                    String fp = sha256Hex(cert.getEncoded());
                    pinnedFingerprints.add(fp);
                    pinNames.put(fp, f.getName());
                    Log.i(TAG, "Loaded pin " + f.getName() + " sha256=" + fp);
                } catch (Exception e) {
                    // Not a cert file; skip silently
                } finally {
                    if (is != null) {
                        try { is.close(); } catch (Exception ignore) {}
                    }
                }
            }
            Log.i(TAG, "Total pinned certs: " + pinnedFingerprints.size());
        } catch (Exception e) {
            Log.e(TAG, "Failed to load pinned certs: " + e.getMessage());
        }
    }

    private String sha256Hex(byte[] data) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] hash = md.digest(data);
        StringBuilder sb = new StringBuilder(hash.length * 2);
        for (byte b : hash) sb.append(String.format(Locale.ROOT, "%02x", b));
        return sb.toString();
    }
}
