Refer to https://github.com/sqlcipher/android-database-sqlcipher/releases

// 19/02/2024
Upgraded to version 4.5.6
	https://repo1.maven.org/maven2/net/zetetic/sqlcipher-android/4.5.6/

// 05/01/2024
Upgrade the version to 4.5.4, 
	https://repo1.maven.org/maven2/net/zetetic/android-database-sqlcipher/4.5.4

// 17/11/2022
Upgrade the version to 4.5.2, 
	https://repo1.maven.org/maven2/net/zetetic/android-database-sqlcipher/4.5.2

Using version: v4.5.2
Download preBuild so file from 

1. https://repo1.maven.org/maven2/net/zetetic/android-database-sqlcipher/4.5.2/android-database-sqlcipher-4.5.2.aar
2. rename .aar to .zip then unzip it
3. take them under jni folder




Using sqlcipher to generate sqlite3.c and sqlite3.h
Refer to: https://www.zetetic.net/sqlcipher/ios-tutorial/



Android: how to build libcrypto.a
  git clone https://github.com/openssl/openssl.git
  cd openssl
  git checkout OpenSSL_1_1_1-stable

  export ANDROID_NDK_ROOT=~/Library/Android/sdk/ndk/25.2.9519653
  export ANDROID_NDK_HOME=~/Library/Android/sdk/ndk/25.2.9519653

  ./Configure android-arm64 no-shared -U__ANDROID_API__ -D__ANDROID_API__=29 -DOPENSSL_NO_UI_CONSOLE -DOPENSSL_NO_STDIO
  make -j
  make libcrypto.a -j

  cop libcrypto.a and inlcude folder to lib and include
