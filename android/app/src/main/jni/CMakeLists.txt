cmake_minimum_required(VERSION 3.13)


# Define the library name here.
project(appmodules)
#sad, it must be named as appmodules, hardcoded by react native
#project(httpsync)

# This file includes all the necessary to let you build your React Native application
include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

# target_compile_definitions(${CMAKE_PROJECT_NAME} PRIVATE SQLITE_THREADSAFE=0 )

#need to Comment out c++20 in node_modules/react-native/ReactAndroid/cmake-utils/ReactNative-application.cmake
#and add target_compile_features(${PROJECT_NAME} PRIVATE cxx_std_20)
target_compile_features(${PROJECT_NAME} PRIVATE cxx_std_20)

add_compile_options(-DSQLITE_ENABLE_BYTECODE_VTAB=1 -DSQLITE_TEMP_STORE=2)
# Define where the additional source code lives. We need to crawl back the jni, main, src, app, android folders
target_sources(${CMAKE_PROJECT_NAME} PRIVATE
        OnLoad.cpp
        expo_sqlite2/vendor/sqlite3/sqlite3.c
        expo_sqlite2/NativeDatabaseBinding.cpp
        expo_sqlite2/NativeStatementBinding.cpp
        expo_sqlite2/SQLite3Wrapper.cpp
        ../../../../../shared_cxx/FileSystem.cpp
        ../../../../../shared_cxx/NativeNPSyncModule.cpp)

# Define where CMake can find the additional header files. We need to crawl back the jni, main, src, app, android folders
target_include_directories(${CMAKE_PROJECT_NAME} PUBLIC ../../../../../shared_cxx)
