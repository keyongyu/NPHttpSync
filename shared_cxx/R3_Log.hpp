// R3_Log.h: interface for the R3_Log class.
//
//////////////////////////////////////////////////////////////////////

#if !defined(AFX_R3_LOG_H__FBD36454_C113_48DF_96D9_BFECE4A73FFA__INCLUDED_)
#define AFX_R3_LOG_H__FBD36454_C113_48DF_96D9_BFECE4A73FFA__INCLUDED_

//#include "TypeDef.h"
#include <string>
#include <mutex>

#define LOG_ERROR_LVL		0x01	//Log all errors
#define LOG_WARNING		0x02	//Log warning information
#define LOG_EVENT		0x04	//Log communication events
#define LOG_DATA		0x08	//Log in/out data
#define LOG_DEBUG		0x10	//Log low level debug information

#if defined(__ANDROID__) || defined(__APPLE__)
#define printf_like(x, y) __attribute__((__format__(printf, (x), (y))))
#else
#define printf_like(x, y)
#endif
class R3_Log
{
public:
	void LogFormatMessage(int nLevel, const char *format, ...)  printf_like(3,4);
	void LogFullMessage(int nLevel, const char *pszData, int nDataLen=-1);
    
	R3_Log(const char* tzDir, const char* tzName, int maxSize = -1, bool bHouseKeepPerCall = true);
    ~R3_Log();
    
    static bool IsIgnored(int nLevel);
    std::string GetLogPath();
    static std::string GetUserActivityLogFileName();
    static const char* GetLastTimestamp();
	static const char* GenerateTimestamp();
    static const char* GetDeviceLogLevel(int nLevel);
protected:
    const char* GetLevelStr(int nLevel);
    bool preMessage();
	void LogDataAndMessage(int nLevel, const char *content, int nContentLength);
    
	int     m_MaxLogSize;
	bool    m_bHouseKeepPerCall;
	char    m_tzLogDir[PATH_MAX];
	char    m_tzFileName[64];
	FILE*   m_hFile;
	static char  m_tzTimestamp[15];
private:
    std::mutex m_mutex;
	bool m_isWritingLog = false;
};


#endif // !defined(AFX_R3_LOG_H__FBD36454_C113_48DF_96D9_BFECE4A73FFA__INCLUDED_)