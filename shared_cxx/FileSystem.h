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

    size_t safe_strcpy(char *dst, const char *src, size_t dst_size) ;

    void safe_strcat(char *dst, const char *src, size_t dst_size);
};


#endif //NPSYNC_FILESYSTEM_H
