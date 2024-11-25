#pragma once
#include <string>
#include <vector>
#include <stdarg.h>
namespace HttpComm {
    class Buffer {
    public:
        size_t          m_nLen;
        void* m_pBuf;
        size_t          m_nCapcity;

        ~Buffer() {
            free(m_pBuf);
        }
        Buffer(int nCap = 1024) :m_pBuf(NULL) {
            Init(nCap);
        }
        void Init(size_t nCap) {
            if (m_pBuf)
                free(m_pBuf);
            if(nCap<=0)
                nCap=4;
            m_pBuf = calloc(nCap, 1);
            m_nCapcity = nCap;
            m_nLen = 0;
        }
        void Detach(void** pBuf, size_t* nLen) {
            *pBuf = m_pBuf;
            *nLen = m_nLen;
            m_nCapcity = 0;
            m_nLen = 0;
            m_pBuf = NULL;
        }
        void Reset() {
            Init(1024);
        }
        int Available() {
            return m_nCapcity - m_nLen;
        }

        int AppendFormat(const char* fmt, ...) {
            va_list ap, saved;
            va_start(ap, fmt);
            va_copy(saved, ap);
            int n = vsnprintf((char*)m_pBuf + m_nLen, Available(), fmt, saved);
            if (n >= Available()) {
                Grow(n+1);
                n = vsnprintf((char*)m_pBuf + m_nLen, Available(), fmt, ap);
            }
            if(n>0)
                m_nLen +=n;
            va_end(saved);
            va_end(ap);
            return n;
        }

        //    void UpdateFormat(int pos,const char *fmt,...){
        //        /*static char buf[512];
        //        va_list ap;
        //        va_start(ap,fmt);
        //        int n = vsnprintf(buf, sizeof(buf), fmt, ap);
        //        va_end(ap);
        //        if(n>0)
        //            Update(pos, buf, n);
        //        */
        //    }

        inline void Append(const char* p) {
            Append((void*)p, strlen(p));
        }

        void Grow(size_t len) {
            if (m_pBuf == NULL)
                Init(len);
            if (len + m_nLen > m_nCapcity) {
                do {
                    if (m_nCapcity < 1024 * 1024)
                        m_nCapcity = m_nCapcity * 2;
                    else
                        m_nCapcity = len + m_nLen + 2048;

                } while (len + m_nLen > m_nCapcity);
                m_pBuf = realloc(m_pBuf, m_nCapcity);
            }
        }
        void Append(const void* p, size_t len) {
            Grow(len);
            memcpy(((char*)m_pBuf) + m_nLen, p, len);
            m_nLen += len;
        }
        //    void Update(int pos, void * p, size_t len){
        //        Grow(len);
        //        memcpy(((char*)m_pBuf)+pos,p,len);
        //        m_nLen+=len;
        //    }
            //bool AppendFileInBase64(const char * fileName);
        bool AppendFileInBase64WithoutPadding(const char* pFileName);
        bool AppendDataInBase64(void* pData, size_t len);

        void JsonAppendString(const char* p, unsigned int N = 0);
    };

//    struct  UploadFile {
//        const std::string fileName;
//        const std::string columnName;
//        const std::string commsStatus;
//        const std::string table;
//        const uint64_t rowid;
//
//        UploadFile(const char* pfileName, const char* pColumnName, const char* pCommsStatus, const char* pTable, const uint64_t pRowId)
//            :fileName(pfileName), columnName(pColumnName), commsStatus(pCommsStatus), table(pTable), rowid(pRowId)
//        {
//        }
//    };
//
//    struct Comm2Txn {
//        bool			        m_HasNext;
//        std::vector<uint64_t>* m_pRowIDs;
//        Buffer* m_pBuf;
//        int               m_MsgID;
//        Comm2Txn() :m_HasNext(false), m_pRowIDs(nullptr), m_pBuf(nullptr), m_MsgID(0) {}
//    };
//
//    struct Comm2TblSync {
//
//    };
//
//    bool Comm2_GetTxnHangingFiles(const std::string& name, const std::string& json_str,
//        std::vector<UploadFile>& files, std::string& err_desc);
//
//    bool Comm2_MakeTxn(const std::string& strCompany, const std::string& strAppID, const std::string& strRefreshToken, unsigned long max_msgsize,
//        const std::string& name, const std::string& json_str, Comm2Txn& txn, std::string& err_desc);
//
//    bool Comm2_CommitTxn(const std::string& txnName, const std::string& hdrName,
//        uint64_t* pRowIDs, size_t num_ids, std::string statusFlag);
//
    std::string Comm2_ProcessTblSync(const std::string& fileName, bool dryRun);
//    std::string Comm2_GetAndResetSmartTxnTables(bool bClearTables);
//    void Comm2_EnableSmartTxnUploading(bool bEnabled);
//    std::string chromium_base64_encode(const std::string& src);
//    void RegistorUDF(DBN * psDBN);

    #define LOG_MSG(lvl, ...)   if(NativeNPLoggerModule::logger_)         \
                                NativeNPLoggerModule::logger_->LogFormatMessage(lvl, __VA_ARGS__)

    std::string string_format(const char* fmt, ...);
}
