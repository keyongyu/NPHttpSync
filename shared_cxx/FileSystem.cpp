//
// Created by KeYong Yu on 22/11/24.
//

#include "FileSystem.h"
#include <dirent.h>
#include <sys/stat.h>
#include <unistd.h>
namespace FileSystem {
    inline bool is_slash(char ch) {
        return ch == '/';
    }
/*
 * Copy src to string dst.
 * At most dst_size-1 characters will be copied.
 * Always NULL terminates dst string (unless dst_size == 0).
 */
    size_t safe_strcpy(char *dst, const char *src, size_t dst_size) {
        char *d = dst;
        const char *s = src;
        size_t n = dst_size;
        if (n == 0)
            return 0;
        // Copy bytes until the dst buffer full
        while (--n != 0) {
            if ((*d++ = *s++) == '\0') //early terminate
                return d-dst-1;
        }
        // the string in src cannot fit into the dst buffer (copied dst_size - 1 bytes)
        *d = '\0';        // NULL terminate the dst
        return d-dst-1;
    }

/*
 * Appends src to string dst up to dst buffer size.
 * At most dst_size-1 characters will be in dst.
 * Always NUL terminates dst string (unless dst_size == 0).
 */
    void safe_strcat(char *dst, const char *src, size_t dst_size)
    {
        char *d = dst;
        const char *s = src;
        size_t n = dst_size;
        size_t orgLen;
        if (dst_size == 0)
            return;
        // Find the end of dst
        while (n-- != 0 && *d != '\0')
            d++;
        orgLen = d - dst;
        n = dst_size - orgLen;
        if (n == 0) {
            return;
        }
        while (*s != '\0') {
            if (n != 1) {
                *d++ = *s++;
                n--;
            }
            else
                break;
        }
        *d = '\0';
    }

    int mkdir_p(const char *path1, int32_t mode) {
        char *path = (char *) path1;
        int32_t numask, oumask;
        int first, last, retval;
        char *p;

        p = path;
        oumask = 0;
        retval = 0;
        if (is_slash(p[0]))       /* Skip leading '/'. */
            ++p;
        for (first = 1, last = 0; !last; ++p) {
            if (p[0] == '\0')
                last = 1;
            else if (!is_slash(p[0]))
                continue;
            char c = *p; //save current slash
            *p = '\0';
            if (!last && p[1] == '\0')
                last = 1;
            if (first) {
                oumask = umask(0);
                /* Ensure intermediate dirs are wx */
                numask = oumask & ~(S_IWUSR | S_IXUSR);
                (void) umask(numask);
                first = 0;
            }
            if (last)
                (void) umask(oumask);
            struct stat sb;
            if (mkdir(path, last ? mode : S_IRWXU | S_IRWXG | S_IRWXO) < 0) {
                if (errno == EEXIST || errno == EISDIR) {
                    if (stat(path, &sb) < 0) {
                        *p = c; //restore current slash
                        retval = errno;
                        break;
                    } else if (!S_ISDIR(sb.st_mode)) {
                        if (last)
                            retval = EEXIST;
                        else
                            retval = ENOTDIR;
                        *p = c; //restore current slash
                        break;
                    }
                    //folder already exists, don't think it is an error.

                } else {
                    //other error
                    *p = c; //restore current slash
                    retval = errno;

                    break;
                }
            }
            *p = c; //restore current slash
        }
        if (!first && !last)
            (void) umask(oumask);
        return (retval);
    }

    bool DeleteAllInFolder(const char* file_path) {
        if (file_path == NULL)
            return false;

        char sFileName[512];
        DIR *dp;
        struct dirent *ep;
        dp = opendir(file_path);

        if (dp != NULL) {
            while ((ep = readdir(dp)) != NULL) {
                if (strcmp(ep->d_name, ".") == 0 || strcmp(ep->d_name, "..") == 0)
                    continue;
                safe_strcpy(sFileName, file_path, sizeof(sFileName));
                if (file_path[strlen(file_path) - 1] != '/')
                    safe_strcat(sFileName, "/", sizeof(sFileName));
                safe_strcat(sFileName, ep->d_name, sizeof(sFileName));
                if (ep->d_type == DT_DIR) {
                    DeleteAllInFolder(sFileName);
                    rmdir(sFileName);
                } else {
                    unlink(sFileName);

                }
            }
            closedir(dp);
        }
        return true;
    }
    bool MatchWildCharPat(char const *pat, char const *str) {
        switch (*pat) {
            case '\0': return *str=='\0';
            case '*':
                return MatchWildCharPat(pat+1, str) || (*str && MatchWildCharPat(pat, str+1));
            case '?': return *str && MatchWildCharPat(pat+1, str+1);
            default: return (*pat&(~0x20))==(*str&(~0x20)) && MatchWildCharPat(pat+1, str+1);
        }
    }
#define MAX_PATH PATH_MAX

    int DeleteFileAll(const char* pSrcDir, const char* pSrcFile)
    {
        char szSource[MAX_PATH];

        if (!pSrcDir || !pSrcFile || !pSrcFile[0])
            return 0;
        if (pSrcDir[0])
            snprintf(szSource, sizeof(szSource), "%s/%s", pSrcDir, pSrcFile);
        else
            snprintf(szSource, sizeof(szSource), "/%s", pSrcFile);

        char* l_pszSlash = strrchr(szSource, '/');
        *l_pszSlash = 0;
        std::string sPath = szSource;

        DIR *dir;
        if (szSource[0])
            dir = opendir(szSource);
        else
            dir = opendir("/");
        if (dir) {
            struct dirent *ent;
            while ((ent = readdir(dir)) != NULL) {
                // skip those folders
                if (ent->d_type == DT_DIR)
                    continue ;
                if (MatchWildCharPat(pSrcFile,ent->d_name)) {
                    snprintf(szSource, sizeof(szSource), "%s/%s", sPath.c_str(), ent->d_name);
                    unlink(szSource);
                }
            }
            closedir(dir) ;
        }

        return 1;
    }


    void MakeDir(std::string dir){
        mkdir_p(dir.c_str(),0700);
    }
    void DeleteFolder(std::string dir){
        DeleteAllInFolder(dir.c_str());
    }
}