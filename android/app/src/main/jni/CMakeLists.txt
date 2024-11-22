cmake_minimum_required(VERSION 3.13)


# Define the library name here.
project(appmodules)
#project(httpsync)

# This file includes all the necessary to let you build your React Native application
include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)
target_compile_definitions(${CMAKE_PROJECT_NAME} PRIVATE SQLITE_THREADSAFE=0 )
target_compile_features(${PROJECT_NAME} PRIVATE cxx_std_20)
# Define where the additional source code lives. We need to crawl back the jni, main, src, app, android folders
target_sources(${CMAKE_PROJECT_NAME} PRIVATE
        OnLoad.cpp
        #../../../../../shared_cxx/sqlite/sqlite3.c
        ../../../../../shared_cxx/FileSystem.cpp
        ../../../../../shared_cxx/NativeNPSyncModule.cpp)

# Define where CMake can find the additional header files. We need to crawl back the jni, main, src, app, android folders
target_include_directories(${CMAKE_PROJECT_NAME} PUBLIC ../../../../../shared_cxx)