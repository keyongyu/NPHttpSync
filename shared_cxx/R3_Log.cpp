// R3_Log.cpp: implementation of the R3_Log class.

//////////////////////////////////////////////////////////////////////

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <stdarg.h>
#include <errno.h>
#ifdef WINAPI_FAMILY  //WIN_PHONE
#include <io.h>
#include <direct.h>
#else
#include <sys/file.h>
#include <dirent.h>
#endif
#include "R3_Log.hpp"
#include "FileSystem.h"
//#include <iostream>

bool g_diskFullSkipLog = false;
char R3_Log::m_tzTimestamp[15];

int g_nLogLevel;
//////////////////////////////////////////////////////////////////////
// Construction/Destruction
//////////////////////////////////////////////////////////////////////
using namespace FileSystem;

R3_Log::R3_Log(const char* ptzDir, const char* ptzName, int maxLogSize, bool bHouseKeepPerCall) :
m_MaxLogSize(maxLogSize), m_bHouseKeepPerCall(bHouseKeepPerCall)
{
#ifndef PREVIEWER_EXPORTS
    std::lock_guard<std::mutex> lock(m_mutex);
    if (m_MaxLogSize <= 0) {
        if (g_nLogLevel > LOG_DATA)
            m_MaxLogSize = 10 * 1028 * 1024; //change from 300K to 2M //300*1024;
        else
            m_MaxLogSize = 5 * 1024 * 1024; //Change again to 5M 2048 * 1024; //change from 300K to 2M //300*1024;
    }
	//g_nLogLevel = 3;
	safe_strcpy(m_tzLogDir, ptzDir, sizeof(m_tzLogDir));
	safe_strcpy(m_tzFileName, ptzName, sizeof(m_tzFileName));
	m_hFile = NULL;
	if (!m_bHouseKeepPerCall){
		char tzTemp[PATH_MAX];
		snprintf(tzTemp, sizeof(tzTemp), "%s/%s", m_tzLogDir, m_tzFileName);
		FILE* hFile = fopen(tzTemp, "r");
		if (hFile){
			fseek(hFile, 0, SEEK_END);
			long nLen = ftell(hFile);
            int myerrno=errno;
			fclose(hFile);
			if (nLen > m_MaxLogSize || (nLen==-1 &&myerrno == EOVERFLOW)) {
				char tzBack[PATH_MAX];
				snprintf(tzBack, sizeof(tzBack), "%s/%s.bak", m_tzLogDir, m_tzFileName);
				rename(tzTemp, tzBack);
			}
		}
	}
    m_tzTimestamp[0] = 0;
#endif
}
R3_Log::~R3_Log()
{
#ifndef PREVIEWER_EXPORTS
    if (m_hFile)
        fclose(m_hFile);
    m_hFile = NULL;
#endif
}
typedef struct _SYSTEMTIME {
    short wYear;
    short wMonth;     //1~12
    short wDayOfWeek;  // 0-6. (Sunday is 0, Saturday is 6.)
    short wDay;
    short wHour;
    short wMinute;
    short wSecond;      /** Seconds, 0-60. (60 is a leap second.) */
    short wMilliseconds;
} SYSTEMTIME;

void GetLocalTime(SYSTEMTIME * pDate)
{
    if (pDate == NULL) return;

    auto tp = std::chrono::system_clock::now();
    auto sec = std::chrono::time_point_cast<std::chrono::seconds>(tp);
    auto fraction = tp - sec;
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(fraction);
    time_t now = std::chrono::system_clock::to_time_t(tp);
    tm t = *localtime(&now);
    pDate->wMilliseconds = ms.count();
    pDate->wYear = t.tm_year + 1900;
    pDate->wMonth = t.tm_mon + 1;
    pDate->wDay = t.tm_mday;
    pDate->wDayOfWeek = t.tm_wday;
    pDate->wHour = t.tm_hour;
    pDate->wMinute = t.tm_min;
    pDate->wSecond = t.tm_sec;
}

const char* R3_Log::GenerateTimestamp()
{
    //static char tzTemp[15] = {0};
    //time_t now;
    //time(&now);
    //struct tm* st = localtime(&now);
    static char tzTemp[20] = {0};
    SYSTEMTIME now;
    GetLocalTime(&now);
    snprintf(m_tzTimestamp, sizeof(m_tzTimestamp),"%04d%02d%02d%02d%02d%02d",
             now.wYear,
             now.wMonth,
             now.wDay,
             now.wHour,
             now.wMinute,
             now.wSecond);
    
    snprintf(tzTemp, sizeof(tzTemp), "%02d/%02d %02d:%02d:%02d %03d",
        now.wMonth,
        now.wDay,
        now.wHour,
        now.wMinute,
        now.wSecond,
        now.wMilliseconds);
    return tzTemp;
}

const char LOG_ERROR_LVL_STR[]   = "ERROR";
const char LOG_WARNING_STR[] = "WARN ";
const char LOG_EVENT_STR[]   = "EVENT";
const char LOG_DATA_STR[]    = "DATA ";
const char LOG_DEBUG_STR[]   = "DEBUG";
const char* R3_Log::GetLevelStr(int nLevel)
{
    switch (nLevel) {
        case LOG_ERROR_LVL:
            return LOG_ERROR_LVL_STR;
        case LOG_WARNING:
            return LOG_WARNING_STR;
        case LOG_EVENT:
            return LOG_EVENT_STR;
        case LOG_DATA:
            return LOG_DATA_STR;
        
        case LOG_DEBUG:
        default:
            break;
    }
    return LOG_DEBUG_STR;
}

//Log string follow from NPEngine::LoadDeviceProfile logic, only five level
const char* R3_Log::GetDeviceLogLevel(int mask)
{
    if( mask& LOG_DEBUG)
        return LOG_DEBUG_STR;
    else if( mask & LOG_DATA)
        return LOG_DATA_STR;
    else if( mask & LOG_EVENT)
        return LOG_EVENT_STR;
    else if( mask & LOG_WARNING)
        return LOG_WARNING_STR;
    else if( mask & LOG_ERROR_LVL)
        return LOG_ERROR_LVL_STR;
    else{
        return "NOLOG ";
    }
}

bool R3_Log::preMessage()
{
    char tzTemp[PATH_MAX];
    if (NULL == m_hFile) {
        snprintf(tzTemp, sizeof(tzTemp), "%s/%s", m_tzLogDir, m_tzFileName);
        m_hFile = fopen(tzTemp, "ab");
    }
    if (NULL == m_hFile)
        return false;
    if (m_bHouseKeepPerCall){
        // House keeping
        fseek(m_hFile, 0, SEEK_END);
        long nLen = ftell(m_hFile);
        if (nLen > m_MaxLogSize) {    // 100 Kbytes
            // Backup
            fclose(m_hFile);
            char tzBack[PATH_MAX];
            snprintf(tzTemp, sizeof(tzTemp), "%s/%s", m_tzLogDir, m_tzFileName);
            snprintf(tzBack, sizeof(tzBack), "%s/%s.bak", m_tzLogDir, m_tzFileName);
            rename(tzTemp, tzBack);
            
            m_hFile = fopen(tzTemp, "wb");
            if (NULL == m_hFile)
                return false;
        }
    }
    return true;
}

bool R3_Log::IsIgnored(int nLevel)
{
    //bad name for g_nLogLevl, it should be g_nLogMask
    return (g_nLogLevel & nLevel) == 0;
}


void R3_Log::LogFullMessage(int nLevel, const char *szComment , int nDataLen)
{
#ifndef PREVIEWER_EXPORTS
    if (nLevel != 0 && !(g_nLogLevel & nLevel))
        return ;

    LogDataAndMessage(nLevel, szComment, nDataLen);
#endif
}

void R3_Log::LogFormatMessage(int nLevel, const char *format, ...)
{
#ifndef PREVIEWER_EXPORTS
    if (nLevel != 0 && !(g_nLogLevel & nLevel))
        return;
    if (format == NULL || format[0] == 0)
        return;

    int len = 512;

    va_list ap;
    va_start(ap, format);

    if (nLevel == 0 || (nLevel == LOG_DATA && (g_nLogLevel & LOG_DEBUG))) {
        va_list cp;
        va_copy(cp, ap);
        len = vsnprintf(NULL, 0, format, cp) + 5; // add in extra 5 to ensure it not be truncated
        va_end(cp);
    }

    char *buf = new char[len+1];
    int n = vsnprintf(buf, len+1, format, ap);
    va_end(ap);
    if(n>0) {
        if (n >= len) {
            // Add the truncate indicator
            memcpy(&buf[len - 4], " ...", 4);
            LogDataAndMessage(nLevel, buf, len);
        }else {
            LogDataAndMessage(nLevel, buf, n);
        }
    }

    delete []buf;

#endif
}


void R3_Log::LogDataAndMessage(int nLevel, const char *content, int nContentLength) {
#ifndef PREVIEWER_EXPORTS
    // check whether the storage is full and thread has pending log
    if(g_diskFullSkipLog && m_isWritingLog)
        return;

    std::lock_guard<std::mutex> lock(m_mutex);

    m_isWritingLog = true;

    if(!preMessage())
        return ;

    if(nContentLength<0 && content)
        nContentLength = (int) strlen(content);

    if (nLevel != 0 && (g_nLogLevel & nLevel)) {
        const char *levelStr = GetLevelStr(nLevel);

        fprintf(m_hFile, "%s %s ",
                GenerateTimestamp(),
                levelStr
        );
    }else {
        fprintf(m_hFile, "%s ",
                GenerateTimestamp()
        );
    }


    if (content != NULL && nContentLength>0) {
        fwrite(content, 1, nContentLength, m_hFile);
    }
    fwrite("\r\n", 1, 2, m_hFile);
    fflush(m_hFile);
    m_isWritingLog = false;
#endif
}

std::string R3_Log::GetLogPath()
{
    char tzTemp[PATH_MAX] = {0};
    snprintf(tzTemp, sizeof(tzTemp) - 1, ("%s/%s"), m_tzLogDir, m_tzFileName);
    return tzTemp;
}

const char* R3_Log::GetLastTimestamp()
{
    return m_tzTimestamp;
}

