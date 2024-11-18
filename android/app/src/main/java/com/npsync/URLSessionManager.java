package com.npsync;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.AsyncTask;
import android.os.Build;
import android.security.KeyChain;
import android.security.KeyChainAliasCallback;
import android.security.KeyChainException;
import android.util.Log;
import android.webkit.ClientCertRequest;

import androidx.annotation.Nullable;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.CookieHandler;
import java.net.CookieManager;
import java.net.HttpURLConnection;
import java.net.Socket;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.security.PrivateKey;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.text.StringCharacterIterator;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.KeyManager;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLProtocolException;
import javax.net.ssl.SSLSession;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509ExtendedKeyManager;
import javax.net.ssl.X509TrustManager;

public class URLSessionManager {
	public static final String PREFERENCE_KEY = "KEY_FOR_CLIENT_CERTS";
	private static final String tag="URLSessionManager";
	public static String forJSON(String aText){
		final StringBuilder result = new StringBuilder();
		StringCharacterIterator iterator = new StringCharacterIterator(aText);
		char character = iterator.current();
		while (character != StringCharacterIterator.DONE){
			if( character == '\"' ){
				result.append("\\\"");
			}
			else if(character == '\\'){
				result.append("\\\\");
			}
			else if(character == '/'){
				result.append("\\/");
			}
			else if(character == '\b'){
				result.append("\\b");
			}
			else if(character == '\f'){
				result.append("\\f");
			}
			else if(character == '\n'){
				result.append("\\n");
			}
			else if(character == '\r'){
				result.append("\\r");
			}
			else if(character == '\t'){
				result.append("\\t");
			}
			else {
				//the char is not a special one
				//add it to the result as is
				result.append(character);
			}
			character = iterator.next();
		}
		return result.toString();
	}
	//	private static final String TAG = "URLAsyncTask";
//	class URLAsyncTask extends AsyncTask<String, Void, String>{
//
//	    String strID;
//		boolean bCancelling = false;
//		URLAsyncTask() {}
//
//	    @Override
//		protected void onCancelled (String result) {
//			if (m_hashmapTasks.containsKey(strID)) {
//				m_hashmapTasks.remove(strID);
//				SendHttpFailedEvent(strID, -2, "Request cancelled");
//			}
//	    }
//
//	    @Override
//	    protected String doInBackground(String... argv) {
//	        String strRequestID = argv[0];
////			Log.w(TAG, "Do doInBackground=======> strRequestID=" + strRequestID + " ThreadID=" + Thread.currentThread().getName());
//	        String strHTTPMethod = argv[1];
//	        String mWebUrl = argv[2];
//	        String strHeaderPairs = null;
//	        String strContent = null;
//	        boolean bSentAsFile = false;
//	        boolean bReceiveInfile = false;
//	        String	rcvFilePath = null;
//			strID = strRequestID;
//	        if (argv.length > 3)
//	            strHeaderPairs = argv[3];
//	        if (argv.length > 4) {
//	            strContent = argv[4];
//	            if (strContent.startsWith("FILE:")) {
//	            	strContent = argv[4].substring(5);
//	            	bSentAsFile = true;
//	            }
//	        }
//	        if (argv.length > 5) {
//				rcvFilePath = argv[5];
//				if (!rcvFilePath.isEmpty())
//					bReceiveInfile = true;
//	        }
//	        String result = "";
//	        HttpURLConnection  myConnection = null;
//			final URL url;// = new URL(mWebUrl);
//	        try {
//	        	url = new URL(mWebUrl);
//				if (mWebUrl.toLowerCase().indexOf("https://") == 0) {
//					if(true/* AppMain.isBypassHttpsCheckCert()*/) {
//						SSLContext sc = SSLContext.getInstance("TLS");
//						sc.init(new KeyManager[] {m_keyManager}, new TrustManager[]{new MyTrustManager()}, new SecureRandom());
//						//sc.init(mSSLClientKeyMF != null ? mSSLClientKeyMF.getKeyManagers() : null, new TrustManager[]{new MyTrustManager()}, new SecureRandom());
//						HttpsURLConnection.setDefaultSSLSocketFactory(sc.getSocketFactory());
//						HttpsURLConnection.setDefaultHostnameVerifier(new MyHostnameVerifier());
//					}
//					else {// if (mSSLClientKeyMF != null){
//						SSLContext sc = SSLContext.getInstance("TLS");
//						sc.init(new KeyManager[] {m_keyManager}, null, null);
//						//sc.init(mSSLClientKeyMF.getKeyManagers(), null, null);
//						HttpsURLConnection.setDefaultSSLSocketFactory(sc.getSocketFactory());
//					}
//
//		        }
//				myConnection = (HttpURLConnection)url.openConnection();
//				int iTimeOut = 100;
//				if (argv.length > 6) {
//					iTimeOut = Integer.parseInt(argv[6]);
//					if (iTimeOut <= 0)
//						iTimeOut = 100;
//				}
//				myConnection.setConnectTimeout(iTimeOut * 1000);
//				myConnection.setReadTimeout(iTimeOut * 1000);
//
//				// Set HTTP Method
//				myConnection.setRequestMethod(strHTTPMethod);
//	        }
//	        catch (Throwable e) {
//				m_hashmapTasks.remove(strID);
//				if (bCancelling) {
//					SendHttpFailedEvent(strID, -2, "Request cancelled");
//				}
//				else {
//					SendHttpFailedEvent(strRequestID, -1, e.getLocalizedMessage());
//				}
//			  	return result;
//	        }
//	        myConnection.setInstanceFollowRedirects(false);
//			int offset = 0;
//	        // Set Http Headers
//	        try {
//		        if (strHeaderPairs != null && !strHeaderPairs.isEmpty()) {
//		        	String[] headerItems = strHeaderPairs.split("\n");
//                    for (String headerItem : headerItems) {
//                        int index = headerItem.indexOf(":");
//						if (index > 0) {
//							String headerKey = headerItem.substring(0, index);
//							String value = headerItem.substring(index + 1);
//                            if (headerKey.compareTo("npoffset") == 0) { //to support resuming download
//                                offset = Integer.parseInt(value);
//                            }
//                            myConnection.addRequestProperty(headerKey, value);
//                        }
//                    }
//		        }
//	        }
//	        catch (Exception e) {
//				m_hashmapTasks.remove(strID);
//	        	//"Unable to create HTTP(s) connection", e);
//				if (bCancelling) {
//					SendHttpFailedEvent(strID, -2, "Request cancelled");
//				}
//				else {
//					SendHttpFailedEvent(strRequestID, -2, e.getLocalizedMessage());
//				}
//				myConnection.disconnect();
//			  	return result;
//	        }
//
//	        // Send the HTTP body
//	        try {
//		        // Set content length
//		        if (bSentAsFile) {
//		        	//myConnection.setChunkedStreamingMode(2048);
//  		    	  	//append the data file
//  		    	  	FileInputStream fis = new FileInputStream(strContent);
//  		    	  	int fileSize = fis.available();
//  		    	  	int i = 0;
//					myConnection.setFixedLengthStreamingMode(fileSize);
//  		    	  	myConnection.addRequestProperty("Content-Length", String.valueOf(fileSize));
//                  	myConnection.setDoOutput(true);
//				    OutputStream out = myConnection.getOutputStream ();
//					final int blkSize=4096;
//				    byte[] buff = new byte[blkSize];
//  		    	  	while (i < fileSize) {
//  		    	  		int len = Math.min(fileSize - i, blkSize);
//  		    	  		fis.read(buff,0,len);
//  		    	  		out.write(buff,0,len);
//  		    	  		i += len;
//  		    	  		// Report the progress
//  		    	  		SendHttpStatusEvent(strRequestID, AndroidEvent.HTTP_SENDING, i, fileSize);
//  		    	  	}
//  		    	  	fis.close();
//				    out.close();
//		        }
//		        else if (strContent != null && !strContent.isEmpty()) {
//                    byte[] data = strContent.getBytes(StandardCharsets.UTF_8);
//					myConnection.setFixedLengthStreamingMode(data.length);
//                    myConnection.addRequestProperty("Content-Length", String.valueOf(data.length));
//                    myConnection.setDoOutput(true);
//                    DataOutputStream out = new DataOutputStream (myConnection.getOutputStream ());
//                    //out.writeBytes(strContent);
//                    out.write(data);
//                    out.close();
//		        }
//			    else
//					myConnection.setDoOutput(false);
//			} catch (IOException e) {
//				m_hashmapTasks.remove(strID);
//				if (bCancelling) {
//					SendHttpFailedEvent(strID, -2, "Request cancelled");
//				}
//				else {
//					SendHttpFailedEvent(strRequestID, -3, e.getLocalizedMessage());
//				}
//				myConnection.disconnect();
//				return result;
//			}
//
//	        // Receive Response
//	        try {
//			    int iRspCode = myConnection.getResponseCode();
//
////				Log.w(TAG, "Do doInBackground Receive Response strRequestID=" + strRequestID);
//			    // Get the response's http headers
//			    boolean bFirst = true;
//			    StringBuilder builder = new StringBuilder();
//			    builder.append("{");
//			    Map<String, List<String>> map = myConnection.getHeaderFields();
//			    List<String> valueList = map.get("Content-Length");
//			    int iTotalSize = 0;
//			    if (valueList != null) {
//			    	iTotalSize = Integer.parseInt(valueList.get(0));
//			    }
//			    valueList = map.get("Content-Type");
//				String charsetName = null;
//				if (valueList != null) {
//					for(String v : valueList) {
//						String charset="charset=";
//						int pos = v.indexOf(charset);
//						if(pos>=0){
//							charsetName = v.substring(pos+charset.length());
//							pos = charsetName.indexOf(';');
//							if(pos>=0){
//								charsetName = charsetName.substring(0, pos);
//							}
//						}
//					}
//
//				}
//			    for (Map.Entry<String, List<String>> entry : map.entrySet())
//			    {
//			        if (entry.getKey() == null)
//			            continue;
//			        if (bFirst) {
//			        	builder.append("\n");
//			        	bFirst = false;
//			        }
//			        else
//			        	builder.append(",\n");
//			        builder.append("\"").append( entry.getKey())
//			               .append("\":\"");
//
//			        List<String> headerValues = entry.getValue();
//			        Iterator<String> it = headerValues.iterator();
//			        if (it.hasNext()) {
//			            builder.append(forJSON(it.next()));
//
//			            while (it.hasNext()) {
//			                builder.append(", ")
//			                       .append(forJSON(it.next()));
//			            }
//			        }
//
//			        builder.append("\"");
//			    }
//			    // Add in the requested uri protocol & host into the header items list.
//			    // It can be used to compose full absolute uri for a relative redirect uri.
//	            URL rspURL = myConnection.getURL();
//	            builder.append(",\n\"request_base_uri\":\"").append(rspURL.getProtocol()).append("://").append(rspURL.getHost()).append("\"");
//
//			    builder.append("\n}");
//			    // Get the http body
//			    // Try to read from error stream first
//		    	InputStream in = myConnection.getErrorStream();
//			    if (in != null) {
//			    	result = convertStreamToString(in, charsetName);
//				    SendHttpResultEvent(strRequestID, iRspCode, builder.toString(), result, false);
//			    }
//			    else {
//			    	if (bReceiveInfile) {
//			    		in = myConnection.getInputStream();
//						FileOutputStream out;
//						final boolean appendMode = offset > 0;
//						String[] rcvNamePath = rcvFilePath.split("\\|");
//						out = new FileOutputStream(rcvNamePath[1], appendMode);
//						result = rcvNamePath[0];
//					    byte[] buff = new byte[2048];
//					    int iLen, iReceived = offset;
//	  		    	  	while ((iLen =in.read(buff)) > 0) {
//	  		    	  		out.write(buff,0,iLen);
//	  		    	  		iReceived += iLen;
//	  		    	  		// Report the progress
//	  		    	  		SendHttpStatusEvent(strRequestID, AndroidEvent.HTTP_RECEIVING, iReceived, iTotalSize);
//	  		    	  	}
//					    out.close();
//					    SendHttpResultEvent(strRequestID, iRspCode, builder.toString(), result, true);
//			    	}
//			    	else {
//						in = myConnection.getInputStream();
//						result = convertStreamToString(in,charsetName);
//					    SendHttpResultEvent(strRequestID, iRspCode, builder.toString(), result, false);
//			    	}
//			    }
//			    if (in != null)
//			    	in.close();
//			}
//			catch (SSLProtocolException eSSL) {
////				String remoteAddr = url.getHost() + ":" + url.getPort();
////				m_hashAddrAlias.remove(remoteAddr);
////				UpdatePreference();
//				SendHttpFailedEvent(strRequestID, -6, eSSL.getLocalizedMessage());
//			}
//			catch (IOException e) {
//				if (bCancelling) {
//					SendHttpFailedEvent(strID, -2, "Request cancelled");
//				}
//				else {
//					SendHttpFailedEvent(strRequestID, -4, e.getLocalizedMessage());
//				}
//			}
//	        catch(Exception ee) {
//				if (bCancelling) {
//					SendHttpFailedEvent(strID, -2, "Request cancelled");
//				}
//				else {
//					SendHttpFailedEvent(strRequestID, -5, ee.getLocalizedMessage());
//				}
//	        }
//	        finally {
//				m_hashmapTasks.remove(strID);
//				myConnection.disconnect();
//			}
//	        return result;
//	    }
//
//	}
//
//	// Singleton instance
//	private static volatile URLSessionManager instance;
//	private ConcurrentHashMap<String, URLAsyncTask> m_hashmapTasks;
//	private ConcurrentHashMap<String, String> m_hashAddrAlias;
//	private X509ExtendedKeyManager m_keyManager = null ;
//    private URLSessionManager() {
//		m_hashmapTasks = new ConcurrentHashMap<String, URLAsyncTask>();
//		m_hashAddrAlias = new ConcurrentHashMap<String, String>();
//		// Load client cert alias from shared preference
//		Context ct = NativeHelper.getAppMain();
//		SharedPreferences pref = ct.getSharedPreferences(ct.getPackageName(), Context.MODE_PRIVATE);
//		String certsConfig = pref.getString(PREFERENCE_KEY, null);
//		if (certsConfig != null) {
//			String[] certP = certsConfig.split("\n");
//			for (String item : certP) {
//				String[] oneP = item.split("=");
//				if (oneP.length > 1) {
//					m_hashAddrAlias.put(oneP[0], oneP[1]);
//				}
//			}
//		}
//		m_keyManager = new X509ExtendedKeyManager() {
//			@Override
//			public String[] getClientAliases(String s, Principal[] principals) {
//				return new String[0];
//			}
//
//			@SuppressLint("WrongConstant")
//			@Override
//			public String chooseClientAlias(String[] types, Principal[] issuers, Socket socket) {
//				String remoteAddr = socket.getInetAddress().toString();
//				int pos = remoteAddr.indexOf('/');
//				if (pos > 0) {
//					remoteAddr = remoteAddr.substring(0, pos);
//				}
//				remoteAddr += ":" + socket.getPort();
//				if (m_hashAddrAlias.containsKey(remoteAddr))
//					return m_hashAddrAlias.get(remoteAddr);
//				final String[] alias = new String[1];
//				if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
//					final Object syncObj = new Object();
//					KeyChainAliasCallback keyChainAliasCallback = new KeyChainAliasCallback() {
//						@Override
//						public void alias(@Nullable String s) {
//							Log.d(tag, "selected alias = " + s);
//							alias[0] = s;
//							synchronized (syncObj) {
//								syncObj.notify();
//							}
//						}
//					};
//					KeyChain.choosePrivateKeyAlias(NativeHelper.getAppMain(),
//							keyChainAliasCallback, types, issuers, null, null);
////									KeyChain.choosePrivateKeyAlias(MainActivityHelper.getAppMain().getAppContext(),
////											keyChainAliasCallback, null, null, null, "test");
//					// Wait for the
//					synchronized (syncObj) {
//						try {
//							syncObj.wait();
//						} catch (InterruptedException ignored) {
//
//						}
//					}
//				}
//				if (alias[0] != null) {
//					m_hashAddrAlias.put(remoteAddr, alias[0]);
//					UpdatePreference();
//				}
//				return alias[0];
//			}
//
//			@Override
//			public String[] getServerAliases(String s, Principal[] principals) {
//				return new String[0];
//			}
//
//			@Override
//			public String chooseServerAlias(String s, Principal[] principals, Socket socket) {
//				return null;
//			}
//
//			@Override
//			public X509Certificate[] getCertificateChain(String s) {
//				try {
//					X509Certificate[] certs = KeyChain.getCertificateChain(NativeHelper.getAppMain(), s);
//					if (certs == null || certs.length == 0)
//						RemoveAlias(s);
//					return certs;
//				} catch (KeyChainException | InterruptedException ignored) {
//				}
//				return null;
//			}
//
//			@Override
//			public PrivateKey getPrivateKey(String s) {
//				try {
//					PrivateKey key = KeyChain.getPrivateKey(NativeHelper.getAppMain(), s);
//					if (key == null)
//						RemoveAlias(s);
//					return key;
//				}
//				catch (Exception ignored) {
//				}
//				return null;
//			}
//		};
//	}
//	private class ProceedClientCertRequest extends AsyncTask<String, String, String> {
//		private final ClientCertRequest mRequest;
//		private final String mAlias;
//		ProceedClientCertRequest(ClientCertRequest request, String alias) {
//			mRequest = request;
//			mAlias = alias;
//		}
//		@Override
//		protected String doInBackground(String... strings) {
//			PrivateKey privateKey;
//			X509Certificate[] certificateChain;
//			try {
//				Context c = NativeHelper.getAppMain();
//				privateKey = KeyChain.getPrivateKey(c, mAlias);
//				certificateChain = KeyChain.getCertificateChain(c, mAlias);
//			} catch (Exception e) {
//				mRequest.ignore();
//				return null;
//			}
//			if (privateKey == null || certificateChain == null ||certificateChain.length == 0){
//				// Remove the invalid alias
//				RemoveAlias(mAlias);
//				mRequest.ignore();
//			}
//			else
//				mRequest.proceed(privateKey, certificateChain);
//			return null;
//		}
//	}
//	protected void RemoveAlias(String alias) {
//		if (alias == null)
//			return;
//		for (String key : m_hashAddrAlias.keySet()) {
//			String a = m_hashAddrAlias.get(key);
//			if (a != null && a.compareTo(alias) == 0) {
//				m_hashAddrAlias.remove(key);
//				UpdatePreference();
//				return;
//			}
//		}
//	}
//
//    public static URLSessionManager getInstance(){
//        if(instance == null){
//            synchronized (URLSessionManager.class) {
//                if(instance == null){
//                    instance = new URLSessionManager();
//                    //Enable VM-wide cookie management using CookieHandler and CookieManager
//                    CookieManager cookieManager = new CookieManager();
//                    CookieHandler.setDefault(cookieManager);
//                }
//            }
//        }
//        return instance;
//    }
//	private void UpdatePreference() {
//		Context ct = NativeHelper.getAppMain();
//		SharedPreferences pref = ct.getSharedPreferences(ct.getPackageName(), Context.MODE_PRIVATE);
//		SharedPreferences.Editor edit = pref.edit();
//		if (m_hashAddrAlias.isEmpty())
//			edit.putString(PREFERENCE_KEY, "");
//		else {
//			StringBuilder certCfg = new StringBuilder();
//			for (String key : m_hashAddrAlias.keySet()) {
//				if (certCfg.length() > 0) {
//					certCfg.append("\n");
//				}
//				certCfg.append(key);
//				certCfg.append("=");
//				certCfg.append(m_hashAddrAlias.get(key));
//			}
//			edit.putString(PREFERENCE_KEY, certCfg.toString());
//		}
//		edit.apply();
//	}
//
//    boolean Execute(String[] argv) {
//    	try {
//			URLAsyncTask task = new URLAsyncTask();
//			//task.execute(argv);
//			m_hashmapTasks.put(argv[0], task);
//			task.executeOnExecutor(AsyncTask.THREAD_POOL_EXECUTOR, argv);
//		}
//		catch(Exception e) {
//			return false;
//		}
////		Log.w(TAG, "End Execute");
//		return true;
//    }
//	void CancelHttpRequest(String strID) {
//		if (strID == null)
//			return;
//		URLAsyncTask task = m_hashmapTasks.get(strID);
//		if (task != null) {
//			task.bCancelling = true;
//			task.cancel(true);
//		}
//	}
//    private void SendHttpStatusEvent(String strID, int iAction, int iDone, int iTotal)
//    {
//	  	AndroidEvent event = AndroidEvent.makeHttpRspEvent(strID, iAction, iDone, iTotal);
//	  	NativeHelper.getAppMain();
//    }
//
//    private void SendHttpResultEvent(String strID, int iRspCode, String strHeaders, String strData, boolean bDataInFile) {
//	  	AndroidEvent event = AndroidEvent.makeHttpRspEvent(strID
//					, AndroidEvent.HTTP_RESULT_RSP
//					, iRspCode, strHeaders, strData);
//	  	MainActivityHelper.getAppMain().sendNativeEvent(event);
//    }
//
//    private void SendHttpFailedEvent(String strID, int iErrorCode, String strReason) {
//	  	AndroidEvent event = AndroidEvent.makeHttpRspEvent(strID
//				, AndroidEvent.HTTP_RESULT_ERR
//				, iErrorCode, null, strReason);
//	  	MainActivityHelper.getAppMain().sendNativeEvent(event);
//    }
//
//	/*
//    private static String convertStreamToStringOld(InputStream is){
//        BufferedReader reader = new BufferedReader(
//            new InputStreamReader(is));
//        StringBuilder sb = new StringBuilder();
//
//        String line = null;
//
//        try {
//            while ((line = reader.readLine()) != null) {
//                sb.append(line + "\n");
//            }
//        } catch (IOException e) {
//            e.printStackTrace();
//        } finally {
//            try {
//                is.close();
//            } catch (IOException e) {
//                e.printStackTrace();
//            }
//        }
//        return sb.toString();
//    }
//    */
//	private static String convertStreamToString(InputStream is,final String charsetName){
//		BufferedInputStream bis = new BufferedInputStream(is);
//		ByteArrayOutputStream buf = new ByteArrayOutputStream();
//		try{
//			int result = bis.read();
//			while(result != -1) {
//				buf.write((byte) result);
//				result = bis.read();
//			}
//			//return buf.toString("UTF-8");
//			return buf.toString(charsetName==null? "UTF-8":charsetName);
//		} catch (IOException e) {
//			Log.e("UrlSession", "fail to convert stream to string", e);
//			//e.printStackTrace();
//		} finally {
//			try {
//				is.close();
//			} catch (IOException e) {
//				//Log.e("UrlSession", "fail to convert stream to string", e);
//			}
//		}
//		return  "";
//	}
//	private static class MyHostnameVerifier implements HostnameVerifier {
//		@SuppressLint("BadHostnameVerifier")
//		public boolean verify(String hostname, SSLSession session) {
//			return true;
//		}
//	}
//
//    @SuppressLint("CustomX509TrustManager")
//	private static class MyTrustManager implements X509TrustManager {
//
//        @SuppressLint("TrustAllX509TrustManager")
//		@Override
//        public void checkClientTrusted(X509Certificate[] chain, String authType) {
//        }
//
//        @SuppressLint("TrustAllX509TrustManager")
//		@Override
//        public void checkServerTrusted(X509Certificate[] chain, String authType) {
//        }
//
//        @Override
//        public X509Certificate[] getAcceptedIssuers() {
//                return null;
//        }
//    }

}
