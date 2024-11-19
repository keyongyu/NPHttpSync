package com.npsync;

import android.os.AsyncTask;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.WritableNativeMap;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.CookieHandler;
import java.net.CookieManager;
import java.net.HttpURLConnection;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.nio.ByteBuffer;
import java.nio.channels.Channels;
import java.nio.channels.WritableByteChannel;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.GZIPInputStream;

import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSession;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

public class URLSessionManager {
	public static final String PREFERENCE_KEY = "KEY_FOR_CLIENT_CERTS";
	private static final String tag="URLSessionManager";
	static final  int HTTP_SENDING   = 1;
	static final  int HTTP_RECEIVING = 2;
	//static final  int HTTP_RESULT_ERR = 3;
	//static final  int HTTP_RESULT_RSP = 4;
	//static final int HTTP_HEADER_READY = 5;
	static class URLAsyncTask extends AsyncTask<String, Void, String>{
		ByteBuffer m_Blob = null;
		int m_BlobLength = 0;

		String strID;
		Callback mCB;
		URLAsyncTask(Callback cb, ByteBuffer blob, int blob_length ){
			if (blob != null) {
				m_Blob = blob;
				m_BlobLength = blob_length;
			}
			mCB=cb;
		}

		void SendHttpStatusEvent(String strID, int iAction, int iDone, int iTotal)
		{
			//mCB.invoke(strID, iAction, iDone, iTotal);
			WritableNativeMap evt = new WritableNativeMap();
			evt.putString("req_id", strID);
			evt.putString("type", iAction==HTTP_SENDING?"SENDING":"RECEIVING");
			evt.putInt("total", iTotal);
			evt.putInt("done", iDone);
			mCB.invoke(evt);

		}

		void SendHttpHeaderReadyEvent(String strID, int iRspCode, Map map) {
			WritableNativeMap evt = new WritableNativeMap();
			WritableNativeMap headerMap = Arguments.makeNativeMap(map);
			evt.putString("req_id", strID);
			evt.putString("type", "HEADER_READY");
			evt.putInt("rsp_code", iRspCode);
			evt.putMap("rsp_header", headerMap);
			mCB.invoke(evt);
		}

		void SendHttpResultEvent(String strID, int iRspCode, Map  map, String strData,
										boolean bDataInFile) {
			//mCB.invoke(strID, HTTP_RESULT_RSP, iRspCode, strHeaders, strData, bDataInFile);
			WritableNativeMap evt = new WritableNativeMap();
			WritableNativeMap headerMap = Arguments.makeNativeMap((Map)map);
			evt.putString("req_id", strID);
			evt.putString("type", "RESULT_RSP");
			evt.putInt("rsp_code", iRspCode);
			evt.putMap("rsp_header", headerMap);
			evt.putString("rsp_data", strData);
			mCB.invoke(evt);
		}

		void SendHttpFailedEvent(String strID, int iErrorCode, String strReason) {
			//mCB.invoke(strID, HTTP_RESULT_ERR, iErrorCode, strReason);
			WritableNativeMap evt = new WritableNativeMap();
			evt.putString("req_id", strID);
			evt.putString("type", "RESULT_ERR");
			evt.putInt("error_code", iErrorCode);
			evt.putString("error_desc", strReason);
			mCB.invoke(evt);
		}

		@Override
		protected void onCancelled (String result) {
			SendHttpFailedEvent(strID, -2, "Request cancelled");
		}

		@Override
		protected String doInBackground(String... argv) {
			String strRequestID = argv[0];
			String strHTTPMethod = argv[1];
			String mWebUrl = argv[2];
			String strHeaderPairs = null;
			String strContent = null;
			boolean bSentAsFile = false;
			boolean bReceiveInfile = false;
			String	rcvFilePath = null;
			if (argv.length > 3)
				strHeaderPairs = argv[3];
			if (argv.length > 4) {
				strContent = argv[4];
				if (strContent.startsWith("FILE:")) {
					strContent = argv[4].substring(5);
					bSentAsFile = true;
				}
			}
			if (argv.length > 5) {
				rcvFilePath = argv[5];
				if (!rcvFilePath.isEmpty())
					bReceiveInfile = true;
			}

			String result = "";
			HttpURLConnection  myConnection;
			try {
				URL url = new URL(mWebUrl);
				// Create a new HttpClient and Post Header

				// Handle https request
				if (mWebUrl.toLowerCase().indexOf("https://") == 0) {
					if( /*AppMain.isBypassHttpsCheckCert()*/true) {
						SSLContext sc = SSLContext.getInstance("TLS");
						sc.init(null, new TrustManager[]{new MyTrustManager()}, new SecureRandom());
						HttpsURLConnection.setDefaultSSLSocketFactory(sc.getSocketFactory());
						HttpsURLConnection.setDefaultHostnameVerifier(new MyHostnameVerifier());
					}
				}
				myConnection = (HttpURLConnection)url.openConnection();
				double iTimeOut = 100.0;
				if (argv.length > 6) {
					iTimeOut = Double.parseDouble(argv[6]);
					if (iTimeOut <= 0)
						iTimeOut = 100.0;
				}
				myConnection.setConnectTimeout((int)(iTimeOut*1000));
				myConnection.setReadTimeout((int)(iTimeOut*1000));

				// Set HTTP Method
				myConnection.setRequestMethod(strHTTPMethod);
			}
		/*catch (MalformedURLException eM) {
			SendHttpFailedEvent(strRequestID, -1, eM.getLocalizedMessage());
			return result;
		}
		catch (ProtocolException eP) {
			SendHttpFailedEvent(strRequestID, -1, eP.getLocalizedMessage());
			return result;
		}*/
			catch (Exception e) {
				//"Unable to create HTTP(s) connection", e);
				SendHttpFailedEvent(strRequestID, -1, e.getLocalizedMessage());
				return result;
			}
			myConnection.setInstanceFollowRedirects(false);
			int offset = 0;
			// Set Http Headers
			try {
				if (strHeaderPairs != null && !strHeaderPairs.isEmpty()) {
					String[] headerItems = strHeaderPairs.split("\n");
					for (String headerItem : headerItems) {
						int index = headerItem.indexOf(":");
						if (index > 0) {
							String headerKey = headerItem.substring(0, index);
							String value = headerItem.substring(index+1);
							if( headerKey.compareTo("npoffset") == 0 ){ //to support resuming download
								offset = Integer.parseInt(value);
							}
							myConnection.addRequestProperty(headerKey, value);
						}
					}
				}
				myConnection.addRequestProperty("Accept-Encoding", "gzip");
			}
			catch (Exception e) {
				//"Unable to create HTTP(s) connection", e);
				SendHttpFailedEvent(strRequestID, -2, e.getLocalizedMessage());
				myConnection.disconnect();
				return result;
			}

			// Send the HTTP body
			try {
				final int blk_size=1024*32;
				if (m_Blob != null && m_BlobLength > 0) {
					assert (m_BlobLength == m_Blob.limit());
					myConnection.setFixedLengthStreamingMode(m_BlobLength);
					myConnection.addRequestProperty("Content-Length", String.valueOf(m_BlobLength));
					myConnection.setDoOutput(true);
					try (WritableByteChannel channel = Channels.newChannel(myConnection.getOutputStream())) {
						int newLimit;
						do {
							newLimit = m_Blob.position() + blk_size;
							if (newLimit > m_BlobLength)
								newLimit = m_BlobLength;
							m_Blob.limit(newLimit);
							channel.write(m_Blob);
							SendHttpStatusEvent(strRequestID, HTTP_SENDING, m_Blob.limit(), m_BlobLength);
						}while(newLimit<m_BlobLength);

						//if( m_BlobLength >0 )
						//    SendHttpStatusEvent(strRequestID, AndroidEvent.HTTP_SENDING, m_BlobLength, m_BlobLength);
					}
				} else {

					// Set content length
					if (bSentAsFile) {
						//myConnection.setChunkedStreamingMode(2048);
						//append the data file
						FileInputStream fis = new FileInputStream(strContent);
						int fileSize = fis.available();
						myConnection.setFixedLengthStreamingMode(fileSize);
						myConnection.addRequestProperty("Content-Length", String.valueOf(fileSize));
						myConnection.setDoOutput(true);
						OutputStream out = myConnection.getOutputStream();
						//DataOutputStream out = new DataOutputStream(myConnection.getOutputStream());
						byte[] buff = new byte[blk_size];
						int i = 0;
						while (i < fileSize) {
							//int len = (fileSize - i > blk_size) ? blk_size: fileSize - i;
							int len = Math.min(fileSize - i , blk_size);
							int n = fis.read(buff, 0, len);
							if(n<0)
								continue;
							out.write(buff, 0, n);
							i += n;
							// Report the progress
							//Log.e("HttpComm",String.format("send file %d",  i ));
							SendHttpStatusEvent(strRequestID, HTTP_SENDING, i, fileSize);
						}
						fis.close();
						out.close();
					} else if (strContent != null && !strContent.isEmpty()) {
						byte[] data = strContent.getBytes(StandardCharsets.UTF_8);
						myConnection.setFixedLengthStreamingMode(data.length);
						myConnection.addRequestProperty("Content-Length", String.valueOf(data.length));
						myConnection.setDoOutput(true);
						OutputStream out = myConnection.getOutputStream();
						//DataOutputStream out = new DataOutputStream(myConnection.getOutputStream());
						//out.writeBytes(strContent);
						out.write(data);
						out.close();
					} else
						myConnection.setDoOutput(false);
				}
			} catch (SocketTimeoutException te) {
				SendHttpFailedEvent(strRequestID, -1001, "Time out");
				myConnection.disconnect();
				return result;
			}catch (IOException e) {
				SendHttpFailedEvent(strRequestID, -3, e.getLocalizedMessage());
				myConnection.disconnect();
				return result;
			}

			// Receive Response
			try {
				int iRspCode = myConnection.getResponseCode();

				// Get the response's http headers
				boolean bFirst = true;
				//StringBuilder builder = new StringBuilder();
				//builder.append("{");
				Map<String, List<String>> headers = myConnection.getHeaderFields();
				// Convert the name of hear items to lower case
				Map<String, List<String>> map = new HashMap<>();
				for (Map.Entry<String, List<String>> entry : headers.entrySet()) {
					if (entry.getKey() != null)
						map.put(entry.getKey().toLowerCase(), entry.getValue());
				}
				List<String> valueList = map.get("content-length");
				int iTotalSize = 0;
				if (valueList != null) {
					iTotalSize = Integer.parseInt(valueList.get(0));
				}
				valueList = map.get("content-type");
				String charsetName = null;
				if (valueList != null) {
					String v = valueList.get(0);
					String charset="charset=";
					int pos = v.indexOf(charset);
					if(pos>=0){
						charsetName = v.substring(pos+charset.length());
						pos = charsetName.indexOf(';');
						if(pos>=0){
							charsetName = charsetName.substring(0, pos);
						}
					}
				}
				valueList = map.get("content-encoding");
				boolean gzipped= false;
				if(valueList!=null)
					gzipped = valueList.get(0).equals("gzip");

//				for (Map.Entry<String, List<String>> entry : map.entrySet())
//				{
//					if (entry.getKey() == null)
//						continue;
//					if (bFirst) {
//						builder.append("\n");
//						bFirst = false;
//					}
//					else
//						builder.append(",\n");
//					builder.append("\"").append( entry.getKey())
//							.append("\":\"");
//
//					List<String> headerValues = entry.getValue();
//					Iterator<String> it = headerValues.iterator();
//					if (it.hasNext()) {
//						builder.append(forJSON(it.next()));
//
//						while (it.hasNext()) {
//							builder.append(", ")
//									.append(forJSON(it.next()));
//						}
//					}
//
//					builder.append("\"");
//				}
//				// Add in the requested uri protocol & host into the header items list.
//				// It can be used to compose full absolute uri for a relative redirect uri.
//				URL rspURL = myConnection.getURL();
//				builder.append (",\n\"request_base_uri\":\"").append(rspURL.getProtocol()).append("://").
//						append( rspURL.getHost()).append("\"");
//
//				builder.append("\n}");


				SendHttpHeaderReadyEvent(strRequestID, iRspCode, map);

				// Get the http body
				// Try to read from error stream first
				InputStream in = myConnection.getErrorStream();
				if (in != null) {
					if (gzipped)
						in = new GZIPInputStream(in);
					result = convertStreamToString(in,charsetName);
					SendHttpResultEvent(strRequestID, iRspCode, map, result, false);
				}
				else if (bReceiveInfile) {
					in = myConnection.getInputStream();
					if (gzipped)
						in = new GZIPInputStream(in);
					final boolean appendMode = offset > 0;
					String[] rcvNamePath = rcvFilePath.split("\\|");
					result = rcvNamePath[0];
					FileOutputStream out = new FileOutputStream(rcvNamePath[1], appendMode);
					final int blk_size = 1024 * 64;
					byte[] buff = new byte[blk_size];
					int iLen, iReceived = offset;
					while ((iLen = in.read(buff)) > 0) {
						out.write(buff, 0, iLen);
						iReceived += iLen;
						// Report the progress
						SendHttpStatusEvent(strRequestID, HTTP_RECEIVING, iReceived, iTotalSize);
					}
					out.close();
					SendHttpResultEvent(strRequestID, iRspCode, map, result, true);
				} else {
					in = myConnection.getInputStream();
					if (gzipped)
						in = new GZIPInputStream(in);
					result = convertStreamToString(in, charsetName);
					SendHttpResultEvent(strRequestID, iRspCode, map, result, false);
				}
				if (in != null)
					in.close();
			}catch (SocketTimeoutException te) {
				SendHttpFailedEvent(strRequestID, -1001, "Time out");
			}catch (IOException e) {
				SendHttpFailedEvent(strRequestID, -4, e.getLocalizedMessage());
			}
			catch(Exception ee) {
				SendHttpFailedEvent(strRequestID, -5, ee.getLocalizedMessage());
			}
			finally {
//				if (bSentAsFile) {
//					Log.e("HttpComm","received rsp");
//				}
				myConnection.disconnect();
			}
			return result;
		}

	}

	// Singleton instance
	private static volatile URLSessionManager instance;
	private URLSessionManager() {
	}

	static URLSessionManager getInstance(){
		if(instance == null){
			synchronized (URLSessionManager.class) {
				if(instance == null){
					instance = new URLSessionManager();
					//Enable VM-wide cookie management using CookieHandler and CookieManager
					CookieManager cookieManager = new CookieManager();
					CookieHandler.setDefault(cookieManager);
				}
			}
		}
		return instance;
	}

	boolean Execute(Callback cb, String[] argv, ByteBuffer blob, int blob_length) {
		try {
			URLAsyncTask task = new URLAsyncTask(cb, blob, blob_length);

			//task.execute(argv);
			task.executeOnExecutor(AsyncTask.THREAD_POOL_EXECUTOR, argv);
		}
		catch(Exception e) {
			return false;
		}
		return true;
	}




	private static String convertStreamToString(InputStream is,final String charsetName){
		BufferedInputStream bis = new BufferedInputStream(is);
		ByteArrayOutputStream buf = new ByteArrayOutputStream();
        try (is) {
            int result = bis.read();
            while (result != -1) {
                buf.write((byte) result);
                result = bis.read();
            }
            return buf.toString(charsetName == null ? "UTF-8" : charsetName);
        } catch (IOException ignored) {
        }
		return  "";
	}


	static class MyHostnameVerifier implements HostnameVerifier {
		public boolean verify(String hostname, SSLSession session) {
			return true;
		}
	}

	static private class MyTrustManager implements X509TrustManager {

		@Override
		public void checkClientTrusted(X509Certificate[] chain, String authType) {
		}

		@Override
		public void checkServerTrusted(X509Certificate[] chain, String authType) {
		}

		@Override
		public X509Certificate[] getAcceptedIssuers() {
			return null;
		}
	}

}

