//
// Created by KeYong Yu on 22/11/24.
//

#ifndef NPSYNC_FILESYSTEM_H
#define NPSYNC_FILESYSTEM_H
#include<string>

namespace FileSystem {
   void MakeDir(std::string dir);
   void DeleteFolder(std::string dir);
   int  DeleteFileAll(const char* pSrcDir, const char* pSrcFile);
};


#endif //NPSYNC_FILESYSTEM_H
