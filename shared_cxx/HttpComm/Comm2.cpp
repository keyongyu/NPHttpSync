#if 1
#include <memory>
#include <random>
#include <map>
#include <vector>
#include <string>
#include "../R3_Log.hpp"
#include "vendor/sqlite3/sqlite3.h"
#include "../rapidjson/document.h"
#include "../rapidjson/writer.h"
#include "../rapidjson/stringbuffer.h"
#include "../rapidjson/error/en.h"

#include "Comm2.h"

#ifndef WINAPI_FAMILY
#include <unistd.h>
#include <sys/mman.h>
#include <fcntl.h>  
#endif
#include "../NativeNPSyncModule.h"
using namespace std;
using namespace facebook::react;
using namespace rapidjson;

//extern R3_Log* g_pHttpCommLog;
#define LOG_MSG(lvl, ...)   if(NativeNPLoggerModule::logger_)         \
                                NativeNPLoggerModule::logger_->LogFormatMessage(lvl, __VA_ARGS__)
#define _stricmp       strcasecmp
namespace HttpComm{
char * np_strupr(char* pOrg){
    char* p=pOrg;
	while (*p) {
		*p = toupper (*p);
		++p;
	}
	return pOrg ;
}
string GetAbsPath(string path){
    if(0==strncmp(NativeNPSyncModule::workDir_.c_str(), path.c_str(), NativeNPSyncModule::workDir_.length())){
       return path;
    }
    return NativeNPSyncModule::workDir_+"/"+path;
}
class CFTMMapFileImpl
{
public:

    void*               fAddr;
    int                 fSize;
    int                 fFildes;
    std::string         fName;

    ~CFTMMapFileImpl();
    CFTMMapFileImpl(const char szFileName[]);
protected:

    void closeMMap();
};

CFTMMapFileImpl::CFTMMapFileImpl(const char filename[]) :fAddr(nullptr), fSize(0), fName(filename)
{
    fFildes = -1;   // initialize to failure case

    int fildes = open(filename, O_RDONLY);
    if (fildes < 0)
    {
        return;
    }

    off_t offset = lseek(fildes, 0, SEEK_END);    // find the file size
    if (offset == -1)
    {
        close(fildes);
        return;
    }
    (void)lseek(fildes, 0, SEEK_SET);   // restore file offset to beginning

    // to avoid a 64bit->32bit warning, I explicitly create a size_t size
    size_t size = static_cast<size_t>(offset);

    void* addr = mmap(nullptr, size, PROT_READ, MAP_PRIVATE, fildes, 0);
    //void* addr2 = mmap(NULL, size, PROT_READ, MAP_PRIVATE, fildes, 0);
    if (MAP_FAILED == addr)
    {
        close(fildes);
        return;
    }
    fFildes = fildes;
    fAddr = addr;
    fSize = (int)size;
}
CFTMMapFileImpl::~CFTMMapFileImpl()
{
    this->closeMMap();
}

void CFTMMapFileImpl::closeMMap()
{
    if (fFildes >= 0)
    {
        munmap(fAddr, fSize);
        close(fFildes);
        fFildes = -1;
    }
}

/*
//"ClientSchema":
{
    "Header": {
        "Name": "TXN_ORDHDR",
        "JoinColumns": [
            "TXN_KEY"
        ]

    },
    "Detail": [
        {
            "Name": "TXN_ORDPRD"

        }
    ]
}
*/
#define CHARPAD '='
static const char e0[256] = {
 'A',  'A',  'A',  'A',  'B',  'B',  'B',  'B',  'C',  'C',
 'C',  'C',  'D',  'D',  'D',  'D',  'E',  'E',  'E',  'E',
 'F',  'F',  'F',  'F',  'G',  'G',  'G',  'G',  'H',  'H',
 'H',  'H',  'I',  'I',  'I',  'I',  'J',  'J',  'J',  'J',
 'K',  'K',  'K',  'K',  'L',  'L',  'L',  'L',  'M',  'M',
 'M',  'M',  'N',  'N',  'N',  'N',  'O',  'O',  'O',  'O',
 'P',  'P',  'P',  'P',  'Q',  'Q',  'Q',  'Q',  'R',  'R',
 'R',  'R',  'S',  'S',  'S',  'S',  'T',  'T',  'T',  'T',
 'U',  'U',  'U',  'U',  'V',  'V',  'V',  'V',  'W',  'W',
 'W',  'W',  'X',  'X',  'X',  'X',  'Y',  'Y',  'Y',  'Y',
 'Z',  'Z',  'Z',  'Z',  'a',  'a',  'a',  'a',  'b',  'b',
 'b',  'b',  'c',  'c',  'c',  'c',  'd',  'd',  'd',  'd',
 'e',  'e',  'e',  'e',  'f',  'f',  'f',  'f',  'g',  'g',
 'g',  'g',  'h',  'h',  'h',  'h',  'i',  'i',  'i',  'i',
 'j',  'j',  'j',  'j',  'k',  'k',  'k',  'k',  'l',  'l',
 'l',  'l',  'm',  'm',  'm',  'm',  'n',  'n',  'n',  'n',
 'o',  'o',  'o',  'o',  'p',  'p',  'p',  'p',  'q',  'q',
 'q',  'q',  'r',  'r',  'r',  'r',  's',  's',  's',  's',
 't',  't',  't',  't',  'u',  'u',  'u',  'u',  'v',  'v',
 'v',  'v',  'w',  'w',  'w',  'w',  'x',  'x',  'x',  'x',
 'y',  'y',  'y',  'y',  'z',  'z',  'z',  'z',  '0',  '0',
 '0',  '0',  '1',  '1',  '1',  '1',  '2',  '2',  '2',  '2',
 '3',  '3',  '3',  '3',  '4',  '4',  '4',  '4',  '5',  '5',
 '5',  '5',  '6',  '6',  '6',  '6',  '7',  '7',  '7',  '7',
 '8',  '8',  '8',  '8',  '9',  '9',  '9',  '9',  '+',  '+',
 '+',  '+',  '/',  '/',  '/',  '/'
};

static const char e1[256] = {
 'A',  'B',  'C',  'D',  'E',  'F',  'G',  'H',  'I',  'J',
 'K',  'L',  'M',  'N',  'O',  'P',  'Q',  'R',  'S',  'T',
 'U',  'V',  'W',  'X',  'Y',  'Z',  'a',  'b',  'c',  'd',
 'e',  'f',  'g',  'h',  'i',  'j',  'k',  'l',  'm',  'n',
 'o',  'p',  'q',  'r',  's',  't',  'u',  'v',  'w',  'x',
 'y',  'z',  '0',  '1',  '2',  '3',  '4',  '5',  '6',  '7',
 '8',  '9',  '+',  '/',  'A',  'B',  'C',  'D',  'E',  'F',
 'G',  'H',  'I',  'J',  'K',  'L',  'M',  'N',  'O',  'P',
 'Q',  'R',  'S',  'T',  'U',  'V',  'W',  'X',  'Y',  'Z',
 'a',  'b',  'c',  'd',  'e',  'f',  'g',  'h',  'i',  'j',
 'k',  'l',  'm',  'n',  'o',  'p',  'q',  'r',  's',  't',
 'u',  'v',  'w',  'x',  'y',  'z',  '0',  '1',  '2',  '3',
 '4',  '5',  '6',  '7',  '8',  '9',  '+',  '/',  'A',  'B',
 'C',  'D',  'E',  'F',  'G',  'H',  'I',  'J',  'K',  'L',
 'M',  'N',  'O',  'P',  'Q',  'R',  'S',  'T',  'U',  'V',
 'W',  'X',  'Y',  'Z',  'a',  'b',  'c',  'd',  'e',  'f',
 'g',  'h',  'i',  'j',  'k',  'l',  'm',  'n',  'o',  'p',
 'q',  'r',  's',  't',  'u',  'v',  'w',  'x',  'y',  'z',
 '0',  '1',  '2',  '3',  '4',  '5',  '6',  '7',  '8',  '9',
 '+',  '/',  'A',  'B',  'C',  'D',  'E',  'F',  'G',  'H',
 'I',  'J',  'K',  'L',  'M',  'N',  'O',  'P',  'Q',  'R',
 'S',  'T',  'U',  'V',  'W',  'X',  'Y',  'Z',  'a',  'b',
 'c',  'd',  'e',  'f',  'g',  'h',  'i',  'j',  'k',  'l',
 'm',  'n',  'o',  'p',  'q',  'r',  's',  't',  'u',  'v',
 'w',  'x',  'y',  'z',  '0',  '1',  '2',  '3',  '4',  '5',
 '6',  '7',  '8',  '9',  '+',  '/'
};

static const char e2[256] = {
 'A',  'B',  'C',  'D',  'E',  'F',  'G',  'H',  'I',  'J',
 'K',  'L',  'M',  'N',  'O',  'P',  'Q',  'R',  'S',  'T',
 'U',  'V',  'W',  'X',  'Y',  'Z',  'a',  'b',  'c',  'd',
 'e',  'f',  'g',  'h',  'i',  'j',  'k',  'l',  'm',  'n',
 'o',  'p',  'q',  'r',  's',  't',  'u',  'v',  'w',  'x',
 'y',  'z',  '0',  '1',  '2',  '3',  '4',  '5',  '6',  '7',
 '8',  '9',  '+',  '/',  'A',  'B',  'C',  'D',  'E',  'F',
 'G',  'H',  'I',  'J',  'K',  'L',  'M',  'N',  'O',  'P',
 'Q',  'R',  'S',  'T',  'U',  'V',  'W',  'X',  'Y',  'Z',
 'a',  'b',  'c',  'd',  'e',  'f',  'g',  'h',  'i',  'j',
 'k',  'l',  'm',  'n',  'o',  'p',  'q',  'r',  's',  't',
 'u',  'v',  'w',  'x',  'y',  'z',  '0',  '1',  '2',  '3',
 '4',  '5',  '6',  '7',  '8',  '9',  '+',  '/',  'A',  'B',
 'C',  'D',  'E',  'F',  'G',  'H',  'I',  'J',  'K',  'L',
 'M',  'N',  'O',  'P',  'Q',  'R',  'S',  'T',  'U',  'V',
 'W',  'X',  'Y',  'Z',  'a',  'b',  'c',  'd',  'e',  'f',
 'g',  'h',  'i',  'j',  'k',  'l',  'm',  'n',  'o',  'p',
 'q',  'r',  's',  't',  'u',  'v',  'w',  'x',  'y',  'z',
 '0',  '1',  '2',  '3',  '4',  '5',  '6',  '7',  '8',  '9',
 '+',  '/',  'A',  'B',  'C',  'D',  'E',  'F',  'G',  'H',
 'I',  'J',  'K',  'L',  'M',  'N',  'O',  'P',  'Q',  'R',
 'S',  'T',  'U',  'V',  'W',  'X',  'Y',  'Z',  'a',  'b',
 'c',  'd',  'e',  'f',  'g',  'h',  'i',  'j',  'k',  'l',
 'm',  'n',  'o',  'p',  'q',  'r',  's',  't',  'u',  'v',
 'w',  'x',  'y',  'z',  '0',  '1',  '2',  '3',  '4',  '5',
 '6',  '7',  '8',  '9',  '+',  '/'
};


#define BADCHAR 0x01FFFFFF

/**
 * you can control if we use padding by commenting out this
 * next line.  However, I highly recommend you use padding and not
 * using it should only be for compatability with a 3rd party.
 * Also, 'no padding' is not tested!
 */
#define DOPAD 1

 /*
  * if we aren't doing padding
  * set the pad character to NULL
  */
#ifndef DOPAD
#undef CHARPAD
#define CHARPAD '\0'
#endif

size_t chromium_base64_encode(char* dest, const char* str, const size_t len)
{
    if(dest==nullptr){
        switch(len%3){
            case 0:
            return len*4/3;
            case 1:
                return len*4/3 +2;
            case 2:
                return len*4/3 +3;
        }
    }
    size_t i = 0;
    uint8_t* p = (uint8_t*)dest;

    /* unsigned here is important! */
    uint8_t t1, t2, t3;

    if (len > 2) {
        for (; i < len - 2; i += 3) {
            t1 = str[i]; t2 = str[i + 1]; t3 = str[i + 2];
            *p++ = e0[t1];
            *p++ = e1[((t1 & 0x03) << 4) | ((t2 >> 4) & 0x0F)];
            *p++ = e1[((t2 & 0x0F) << 2) | ((t3 >> 6) & 0x03)];
            *p++ = e2[t3];
        }
    }

    switch (len - i) {
    case 0:
        break;
    case 1:
        t1 = str[i];
        *p++ = e0[t1];
        *p++ = e1[(t1 & 0x03) << 4];
        //*p++ = CHARPAD;
        //*p++ = CHARPAD;
        break;
    default: /* case 2 */
        t1 = str[i]; t2 = str[i + 1];
        *p++ = e0[t1];
        *p++ = e1[((t1 & 0x03) << 4) | ((t2 >> 4) & 0x0F)];
        *p++ = e2[(t2 & 0x0F) << 2];
        //*p++ = CHARPAD;
    }

    //*p = '\0';
    return p - (uint8_t*)dest;
}
string chromium_base64_encode(const string& src){
    size_t len= chromium_base64_encode(nullptr, src.c_str(),src.length());
    string s(0,len);
    chromium_base64_encode(&s[0], src.c_str(),src.length());
    return s;
}
bool Buffer::AppendFileInBase64WithoutPadding(const char* pFileName)
{
    CFTMMapFileImpl mmap_file(GetAbsPath(pFileName).c_str());
    void* data = mmap_file.fAddr;
    auto len = mmap_file.fSize;
    if (data == nullptr || len == 0) {
        //nothing to append
        return true;
    }
    return AppendDataInBase64(data, len);
}

bool Buffer::AppendDataInBase64(void* pData, size_t data_len)
{
    char* pszIn = (char*)pData;
    if (pData == nullptr)
        return false;

    auto nOutSize = (data_len + 2) / 3 * 4;                      // 3:4 conversion ratio
    Grow(nOutSize);
    char* pszOut;
    if (m_nCapcity - m_nLen < nOutSize)
        return false;
    else
        pszOut = (char*)m_pBuf + m_nLen;

    size_t nWritten = chromium_base64_encode(pszOut, pszIn, data_len);
    assert(m_nLen + nWritten <= m_nCapcity);
    m_nLen += nWritten;
    return true;
}
void Buffer::JsonAppendString(const char* zIn, unsigned int N) {
    if (N == 0)
        N = (unsigned int)strlen(zIn);
    //if (N == 0)
    //	return;
    Grow(N + 2);
    ((char*)m_pBuf)[m_nLen++] = '"';
    for (uint32_t i = 0; i < N; i++) {
        unsigned char c = ((unsigned const char*)zIn)[i];
        if (c == '"' || c == '\\') {
        json_simple_escape:
            Grow(N + 3 - i);
            ((char*)m_pBuf)[m_nLen++] = '\\';
        }
        else if (c <= 0x1f) {
            static const char aSpecial[] = {
                 0, 0, 0, 0, 0, 0, 0, 0, 'b', 't', 'n', 0, 'f', 'r', 0, 0,
                 0, 0, 0, 0, 0, 0, 0, 0,   0,   0,   0, 0,   0,   0, 0, 0
            };
            if (aSpecial[c]) {
                c = aSpecial[c];
                goto json_simple_escape;
            }
            Grow(N + 7 - i);
            ((char*)m_pBuf)[m_nLen++] = '\\';
            ((char*)m_pBuf)[m_nLen++] = 'u';
            ((char*)m_pBuf)[m_nLen++] = '0';
            ((char*)m_pBuf)[m_nLen++] = '0';
            ((char*)m_pBuf)[m_nLen++] = '0' + (c >> 4);
            c = "0123456789abcdef"[c & 0xf];
        }
        ((char*)m_pBuf)[m_nLen++] = c;
    }
    ((char*)m_pBuf)[m_nLen++] = '"';
    assert(m_nLen <= m_nCapcity);
}

//static void JsonAppendEmbeddedFile(Buffer* buf, sqlite3_value* pValue) {
//    switch (sqlite3_value_type(pValue)) {
//        //case SQLITE_NULL: {
//        //case SQLITE_INTEGER:
//        //case SQLITE_FLOAT:
//        //	buf->Append("null", 4);
//        //	break;
//        //}
//    case SQLITE_TEXT: {
//        char* z = (char*)sqlite3_value_text(pValue);
//        //int n =
//        sqlite3_value_bytes(pValue);
//        buf->Append("\"", 1);
//        buf->AppendFileInBase64WithoutPadding(z);
//        buf->Append("\"", 1);
//        //buf->JsonAppendString(z, (size_t)n);
//        break;
//    }
//    default:
//        buf->Append("null", 4);
//        break;
//    }
//}

//static void JsonAppendBoolean(Buffer* buf, sqlite3_value* pValue) {
//    switch (sqlite3_value_type(pValue)) {
//    case SQLITE_INTEGER: {
//        int iValue = sqlite3_value_int(pValue);
//        if (iValue != 0) {
//            buf->Append("true", 4);
//        }
//        else {
//            buf->Append("false", 5);
//        }
//        break;
//    }
//    case SQLITE_TEXT: {
//        char* z = (char*)sqlite3_value_text(pValue);
//        if (_stricmp(z, "true") == 0) {
//            buf->Append("true", 4);
//        }
//        else {
//            buf->Append("false", 5);
//        }
//        break;
//    }
//    default: {
//        buf->Append("false", 5);
//        break;
//    }
//    }
//}

////extract UUID from file field which looks like "TBL_1/UUID.jpg"
////too sad, such handling is hardcoded in txn composition.
//static void JsonAppendUUIDFromFileValue(Buffer* buf, sqlite3_value* pValue)
//{
//	switch (sqlite3_value_type(pValue)) {
//	case SQLITE_TEXT: {
//		const char* z = (const char*)sqlite3_value_text(pValue);
//		uint32_t len = 0;
//		auto p_slash = strrchr(z, '/');
//		if (p_slash != nullptr)
//			z = p_slash + 1;
//		auto p_dot = strrchr(z, '.');
//		if (p_dot != nullptr)
//			len = p_dot - z;
//		buf->JsonAppendString(z, len);
//		break;
//	}
//    case SQLITE_NULL: {
//        buf->Append("null", 4);
//        break;
//    }
//	default:
//		break;
//	}
//}
//
//static void JsonAppendValue(Buffer* buf, sqlite3_value* pValue) {
//    switch (sqlite3_value_type(pValue)) {
//    case SQLITE_NULL: {
//        buf->Append("null", 4);
//        break;
//    }
//    case SQLITE_INTEGER:
//    case SQLITE_FLOAT: {
//        char* z = (char*)sqlite3_value_text(pValue);
//        int n = sqlite3_value_bytes(pValue);
//        buf->Append(z, (size_t)n);
//        break;
//    }
//    case SQLITE_TEXT: {
//        const char* z = (const char*)sqlite3_value_text(pValue);
//        buf->JsonAppendString(z);
//        break;
//    }
//    case SQLITE_BLOB: {
//        int n = sqlite3_value_bytes(pValue);
//        byte* z = (byte*)sqlite3_value_blob(pValue);
//        buf->Append("\"", 1);
//        buf->AppendDataInBase64(z, n);
//        buf->Append("\"", 1);
//
//        break;
//    }
//    default:
//        break;
//    }
//}

struct TxnSchema
{
    string HdrTbl;
    vector<string> JoinKeys;
    vector<string> DtlTbls;
    map<string, vector<string>> EmbeddedColumnMap;
    const vector<string>* GetEmbededColByTable(const string& tbl) const {
        const auto& it = EmbeddedColumnMap.find(tbl);
        if (it != EmbeddedColumnMap.end())
            return &(it->second);
        return nullptr;
    }
};

std::string childStringOr(GenericValue<UTF8<char>>& parent, const char* childName, const char* defaultValue="")
{
     if(!parent.HasMember(childName))
         return defaultValue;
     auto& child = parent [childName];
     if(child.IsString())
         return child.GetString();
     return defaultValue;
}

GenericValue<UTF8<char>>*  childArray(GenericValue<UTF8<char>>& parent,const char* childName)
{
    if(!parent.HasMember(childName))
        return nullptr;
    auto& child= parent [childName];
    if(child.IsArray())
        return nullptr;
    return &child;
}
string string_vprintf(const char* fmt, va_list ap)
{
    int len;
    va_list cp;

    va_copy(cp, ap);
    len = vsnprintf(nullptr, 0, fmt, cp);
    va_end(cp);
    if (len <= 0)
        return "";
    //vsnprintf() will append a NUL, overwriting one of our characters

    //based c++ stardard, the c_str() and data() will return the buffer holding len+1 bytes,
    //the last byte ak byte[len] is null/0, it is harmless that the last byte is overwritten by zero
    string s(len , '\0');
    vsnprintf((char*)s.data(), len+1, fmt, ap);
    return s;
}
std::string string_format(const char* fmt, ...)
{
    va_list ap;
    va_start(ap, fmt);
    string ret = string_vprintf(fmt, ap);
    va_end(ap);
    return ret;
}

bool LoadTxnSchema(const string& json_str, TxnSchema& txn_schema, string& err_desc)
{
    Document document;
    ParseResult ok = document.Parse(json_str.c_str());
    if (!ok) {
        err_desc = string_format("JSON parse error: %s (%u)\n",rapidjson::GetParseError_En(ok.Code()), ok.Offset());
        return false;
    }
    if (!document.HasMember("Header")) {
        err_desc = "No Header in ClientSchema";
        return false;
    }
    auto& hdr = document["Header"];

    string hdr_tbl = childStringOr(hdr,"Name", "");

    auto* pHdrFields = childArray(hdr, "Fields");
    if (!hdr_tbl.empty() && pHdrFields) {
        auto& hdrFields = * pHdrFields;
        for (auto i = 0; i < hdrFields.Size(); ++i) {
            auto assembleType = childStringOr(hdrFields[i],"AssembleType", "");
            if (strcasecmp(assembleType.c_str(), "EMBEDDED") == 0) {
                auto columnName = childStringOr(hdrFields[i], "Name", "");
                if (!columnName.empty()) {
                    txn_schema.EmbeddedColumnMap[hdr_tbl].push_back(columnName);
                }
            }
        }
    }

    Document::ValueType*  pcolumns= childArray(hdr, "JoinColumns") ;
    if(!pcolumns)
         pcolumns =  childArray(hdr, "JoinFields");
    vector<string> join_keys;
    if(pcolumns){
        for (auto i = 0; i < pcolumns->Size(); ++i) {
            if((*pcolumns)[i].IsString())
                join_keys.emplace_back((*pcolumns)[i].GetString());
        }
    }
    else {
        //hardcoded setting: header's key is ID and detail's key is TXN_ID
        join_keys.emplace_back("TXN_ID");
    }

    vector<string> dtl_tbls;
    auto* pdtl= childArray(document,"Detail");
    if(pdtl){
        auto& dtl=*pdtl;
        for (auto i = 0; i < dtl.Size(); ++i) {
            auto dtl_tbl = childStringOr(dtl[i],"Name", "");
            if (!dtl_tbl.length())
            {
                err_desc = R"xxx(No "Name" in "Detail" node)xxx";
                return false;
            }
            dtl_tbls.push_back(dtl_tbl);

            auto*  pdtlFields = childArray(dtl[i],"Fields");
            if (pdtlFields) {
                auto& dtlFields = *pdtlFields;
                for (auto j = 0; j < dtlFields.Size(); ++j) {
                    auto assembleType = childStringOr(dtlFields[i],"AssembleType", "");
                    if (strcasecmp(assembleType.c_str(), "EMBEDDED") == 0) {
                        auto columnName = childStringOr(dtlFields[j],"Name", "");
                        if (!columnName.empty()) {
                            txn_schema.EmbeddedColumnMap[dtl_tbl].push_back(columnName);
                        }
                    }
                }
            }
        }
    }
    txn_schema.HdrTbl = hdr_tbl;
    txn_schema.JoinKeys = join_keys;
    txn_schema.DtlTbls = dtl_tbls;
    return true;
}

typedef std::shared_ptr<sqlite3_stmt> stmt_sptr;

class SqliteHelper
{
protected:
    string						  m_TblName;
    stmt_sptr					  m_Stmt;
    string                        m_ErrorDesc;
public:
    SqliteHelper(const string& tblName) :m_TblName(tblName) {}

    static sqlite3* GetSqliteDB() {
        return NativeNPSyncModule::db_;
    }

    bool ExistsTable() {
        const char *schemaName = "main";
        std::string sSQL = string_format("SELECT count(*) FROM %s.sqlite_master WHERE type='table' AND name='%s'", schemaName, m_TblName.c_str());

        auto stmt= CreateStatement(sSQL);
        if(!stmt)
            return false;
        int ct =0 ;
        while (sqlite3_step(stmt.get()) == SQLITE_ROW) {
             ct = sqlite3_column_int(stmt.get(), 0);
        }
        return ct > 0;
    }

    stmt_sptr CreateStatement(const std::string& sql) {
        sqlite3_stmt* stmt = nullptr;
        auto status = sqlite3_prepare_v2(
            GetSqliteDB(), sql.c_str(), (int)sql.size(), &stmt, nullptr
        );
        if (status == SQLITE_OK) {
            return  std::shared_ptr<sqlite3_stmt>(stmt, &sqlite3_finalize);
        }
        else {
            m_ErrorDesc = sqlite3_errstr(status);
            return std::shared_ptr<sqlite3_stmt>();
        }
    }

public:
    //int BindParameter(int par_idx, sqlite3_value* val) {
    //    auto rc = sqlite3_bind_value(m_Stmt.get(), par_idx, val);
    //    return rc;
    //}
    const string& GetTableName() { return m_TblName; }
    const string& GetErrorDesc() { return m_ErrorDesc; }
};
static uint32_t s_Comm2MsgId = 0;
uint32_t& GetComm2MsgID() {
    if (s_Comm2MsgId == 0) {
        std::mt19937 mt((unsigned int)time( nullptr ));
        s_Comm2MsgId = mt();
    }
    return s_Comm2MsgId;

}

enum TxnFieldType { enNormalTxnField, enBooleanTxnField, enFileTxnField, enBlobTxnField, enCommStatusField };
//class SqliteTxnHelper : public SqliteHelper
//{
//    bool						  m_IsHdr;
//    //true file, false blob
//    map<string, bool>			  m_BinaryFields;
//    vector<TxnFieldType>		  m_FieldsType;
//
//    vector<int>                   m_JionKeysPos;
//protected:
//    void DiscoverBinaryFileds(const string& tblName) {
//        g_pEngine->GetR3Rsc()->GetBinaryFields(tblName.c_str(), m_BinaryFields);
//    }
//
//    void DiscoverJoinKeysPos(const string& tblName, const vector<string>& join_keys)
//    {
//        if (join_keys.size() <= 0) {
//            return;
//        }
//        stmt_sptr stmt = CreateStatement(string_format("PRAGMA table_info = '%s'", tblName.c_str()));
//        if (!stmt.get()) {
//            return;
//        }
//        m_JionKeysPos.resize(join_keys.size(), -1);
//        int seq_of_id = -1;
//        //vector<string> keys = join_keys;
//        int row = 0;
//        int num_solved = 0;
//        while (sqlite3_step(stmt.get()) == SQLITE_ROW) {
//            const char* txt = (const char*)sqlite3_column_text(stmt.get(), 1);
//            if (txt) {
//                if (_stricmp(txt, "ID") == 0) {
//                    seq_of_id = row;
//                }
//                auto it = std::find(join_keys.begin(), join_keys.end(), txt);
//                if (it != join_keys.end()) {
//                    auto seq = it - join_keys.begin();
//                    m_JionKeysPos[seq] = row;
//                    num_solved++;
//                    if (num_solved == m_JionKeysPos.size()) {
//                        break;
//                    }
//                }
//            }
//            row++;
//        }
//        if (seq_of_id != -1) {
//            std::for_each(m_JionKeysPos.begin(), m_JionKeysPos.end(), [seq_of_id](int& seq) {
//                if (seq == -1) {
//                    seq = seq_of_id;
//                }
//                });
//        }
//
//    }
//
//    bool GetFilesFromRow(vector<UploadFile>& files, uint64_t par_rowid,
//        const string& par_commsStatus, const vector<string>* embedded_columns) {
//        int n = sqlite3_column_count(m_Stmt.get());
//        for (int col_id = m_IsHdr ? 1 : 0; col_id < n; ++col_id) {
//            auto fieldType = m_FieldsType[m_IsHdr ? col_id - 1 : col_id];
//            auto val = sqlite3_column_value(m_Stmt.get(), col_id);
//
//            if (fieldType == enFileTxnField && val) {
//                bool isEmbeddedColumn = false;
//                if(embedded_columns){
//                    const auto& columns = *embedded_columns;
//                    const char* txt = (const char*)sqlite3_column_name(m_Stmt.get(), col_id);
//					isEmbeddedColumn = find(columns.begin(), columns.end(), txt) != columns.end();
//				}
//
//                if (!isEmbeddedColumn) {
//                    const char* pFileName = (const char*)sqlite3_value_text(val);
//                    const char* pColumnName = sqlite3_column_name(m_Stmt.get(), col_id);
//                    const char* pCommsStatus = par_commsStatus.c_str();
//                    const char* table = m_TblName.c_str();
//
//                    if (pFileName != NULL && *pFileName != 0 && pColumnName != NULL && *pColumnName != 0)
//                        files.push_back(UploadFile(pFileName, pColumnName, pCommsStatus, table, par_rowid));
//                    else if (pFileName == NULL && pColumnName != NULL && *pColumnName != 0)
//                        files.push_back(UploadFile("", pColumnName, pCommsStatus, table, par_rowid));
//                }
//            }
//        }
//        return true;
//    }
//    bool AppendOneRow(Buffer* buf, const vector<string>* p_embedded_cols)
//    {
//        //int num_solved = 0;
//        int n = sqlite3_column_count(m_Stmt.get());
//        buf->Append("[", 1);
//        for (int col_id = m_IsHdr ? 1 : 0; col_id < n; ++col_id) {
//            auto fieldType = m_FieldsType[m_IsHdr ? col_id - 1 : col_id];
//            auto val = sqlite3_column_value(m_Stmt.get(), col_id);
//
//            if (val) {
//                //if (it != m_BinaryFields.end() && it->second) {
//                switch (fieldType) {
//                case enFileTxnField: {
//                    JsonAppendUUIDFromFileValue(buf, val);
//                    buf->Append(",", 1);
//
//                    bool isEmbeddedColumn = false;
//                    if (p_embedded_cols) {
//                        const vector<string>& columns = * p_embedded_cols;
//                        const char* txt = (const char*)sqlite3_column_name(m_Stmt.get(), col_id);
//                        if (find(columns.begin(), columns.end(), txt) != columns.end())
//                        {
//                            isEmbeddedColumn = true;
//                        }
//                    }
//
//                    if (isEmbeddedColumn) {
//                        JsonAppendEmbeddedFile(buf, val);
//                        buf->Append(",", 1);
//                    }
//
//                }
//                    break;
//                case enBlobTxnField:
//                    //JsonAppendBlob(buf, val);
//                    JsonAppendValue(buf, val);
//                    buf->Append(",", 1);
//                    break;
//                case enNormalTxnField:
//                    JsonAppendValue(buf, val);
//                    buf->Append(",", 1);
//                    break;
//                case enBooleanTxnField:
//                    JsonAppendBoolean(buf, val);
//                    buf->Append(",", 1);
//                    break;
//                case enCommStatusField:
//                    break;
//                }
//            }
//        }
//        if (n > 0)
//            ((char*)buf->m_pBuf)[buf->m_nLen - 1] = ']';
//        else
//            buf->Append("]");
//        return true;
//    }
//
//public:
//
//    SqliteTxnHelper(const string& tbl_name, const vector<string>& join_keys, bool is_head, bool getFilesOnly = false) :SqliteHelper(tbl_name) {
//        m_IsHdr = is_head;
//        DiscoverBinaryFileds(tbl_name);
//
//        if (is_head ){
//            DiscoverJoinKeysPos(tbl_name, join_keys);
//            if( getFilesOnly)
//				m_Stmt = CreateStatement(string_format("select rowid, * from [%s] where COMMS_STATUS in ('P', 'T', '#')",
//					tbl_name.c_str()));
//            else
//				m_Stmt = CreateStatement(string_format("select rowid, * from [%s] where COMMS_STATUS='P'",
//					tbl_name.c_str()));
//            if (!m_Stmt.get()) {
//                m_ErrorDesc = "Can't find table " + tbl_name + " or column COMMS_STATUS";
//            }
//        }
//        else {
//            string where;
//            for (auto& key : join_keys) {
//                where = where + string_format(" %s=? and ", key.c_str());
//            }
//            if (where.length() > 4) {
//                where = where.substr(0, where.length() - 4);
//            }
//
//            string query = string_format("select * from [%s]", tbl_name.c_str());
//            if (where.length() > 0) {
//                query.append(" where ").append(where);
//            }
//            m_Stmt = CreateStatement(query);
//        }
//    }
//    SqliteTxnHelper(const string& tbl_name, string statusFlag) :SqliteHelper(tbl_name), m_IsHdr(true) {
//        string query = string_format("update [%s] set COMMS_STATUS='%s', COMMS_DATETIME=datetime('now') where rowid=?", tbl_name.c_str(), statusFlag.c_str());
//        m_Stmt = CreateStatement(query);
//
//        auto pStmt = m_Stmt.get();
//        if (!pStmt) {
//            query = string_format("update [%s] set COMMS_STATUS='%s' where rowid=?", tbl_name.c_str(), statusFlag.c_str());
//            m_Stmt = CreateStatement(query);
//        }
//    }
//
//    bool UpdateRows(uint64_t* pRowIDs, size_t numRowID) {
//        auto pStmt = m_Stmt.get();
//        if (!pStmt)
//            return false;
//        //int needCommit = sqlite3_get_autocommit(GetSqliteDB());
//        //if (needCommit)
//        sqlite3_exec(GetSqliteDB(), "BEGIN", 0, 0, 0);
//        int rc = SQLITE_OK;
//        for (auto i = 0; i < numRowID; ++i) {
//            uint64_t rowid = pRowIDs[i];
//            sqlite3_bind_int64(pStmt, 1, rowid);
//            sqlite3_step(pStmt);
//            rc = sqlite3_reset(pStmt);
//            if (rc != SQLITE_OK) {
//                m_ErrorDesc = string_format("CommitTxn failed: %s\n", sqlite3_errstr(rc));
//                break;
//            }
//        }
//        //if (needCommit) {
//        if (rc == SQLITE_OK)
//            sqlite3_exec(GetSqliteDB(), "COMMIT", 0, 0, 0);
//        else
//            sqlite3_exec(GetSqliteDB(), "ROLLBACK", 0, 0, 0);
//        //}
//        return (rc == SQLITE_OK);
//    }
//    bool FillAllColumnsInfo(int& nCommStatusColIdx) {
//        nCommStatusColIdx = -1;
//        stmt_sptr stmt = CreateStatement(string_format("PRAGMA table_info = '%s'", m_TblName.c_str()));
//        if (!stmt.get())
//            return !m_IsHdr;
//        int rc = 0;
//        while ((rc = sqlite3_step(stmt.get())) == SQLITE_ROW) {
//            const char* txt = (const char*)sqlite3_column_text(stmt.get(), 1);
//            const char* type = (const char*)sqlite3_column_text(stmt.get(), 2);
//            if (txt && type) {
//                TxnFieldType fieldType = enNormalTxnField;
//                if (m_IsHdr && _stricmp(txt, "COMMS_STATUS") == 0)
//                    nCommStatusColIdx = (int) (m_FieldsType.size());
//                if (_stricmp(txt, "COMMS_STATUS") == 0 || _stricmp(txt, "COMMS_DATETIME") == 0)
//                    fieldType = enCommStatusField;
//                else {
//                    auto it = m_BinaryFields.find(txt);
//                    if (it != m_BinaryFields.end())
//                        fieldType = it->second ? enFileTxnField : enBlobTxnField;
//                    else if (_stricmp(type, "boolean") == 0)
//                        fieldType = enBooleanTxnField;
//                }
//                m_FieldsType.push_back(fieldType);
//            }
//        }
//        if (m_FieldsType.size() == 0) {
//			m_ErrorDesc = "Cannot find table: " + m_TblName;
//			return false;
//		}
//        return true;
//	}
//	bool AppendColumns(Buffer* buf,  const TxnSchema& txn_schema) {
//        stmt_sptr stmt = CreateStatement(string_format("PRAGMA table_info = '%s'", m_TblName.c_str()));
//        if (!stmt.get())
//            return !m_IsHdr;
//        if (buf) buf->Append("[");
//        int row = 0;
//        //int num_solved = 0;
//        while (sqlite3_step(stmt.get()) == SQLITE_ROW) {
//            const char* txt = (const char*)sqlite3_column_text(stmt.get(), 1);
//            const char* type = (const char*)sqlite3_column_text(stmt.get(), 2);
//            if (txt && type) {
//                row++;
//
//                TxnFieldType fieldType = enNormalTxnField;
//                if (_stricmp(txt, "COMMS_STATUS") == 0 || _stricmp(txt, "COMMS_DATETIME") == 0)
//                    fieldType = enCommStatusField;
//                auto it = m_BinaryFields.find(txt);
//                if (it != m_BinaryFields.end()) {
//                    fieldType = it->second ? enFileTxnField : enBlobTxnField;
//
//                    if (buf) {
//                        if (it->second) {
//                            buf->JsonAppendString(txt, (uint32)strlen(txt));
//                            buf->Append(",", 1);
//                        }
//
//                        bool isEmbeddedColumn = false;
//                        const auto*  p_cols= txn_schema.GetEmbededColByTable(GetTableName());
//
//						if (p_cols && find(p_cols->begin(), p_cols->end(), txt) != p_cols->end())
//							isEmbeddedColumn = true;
//
//                        if (isEmbeddedColumn || fieldType == enBlobTxnField) {
//                            string binary_name = string_format("Binary#%s", txt);
//                            buf->JsonAppendString(binary_name.c_str(), (uint32)binary_name.size());
//                            buf->Append(",", 1);
//                        }
//                    }
//                }
//                else {
//                    if (fieldType != enCommStatusField && buf) {
//                        buf->JsonAppendString(txt, (uint32)strlen(txt));
//                        buf->Append(",", 1);
//                    }
//                }
//
//                if (_stricmp(type, "boolean") == 0) {
//                    fieldType = enBooleanTxnField;
//                }
//                m_FieldsType.push_back(fieldType);
//            }
//        }
//        if (row > 0 && buf)
//            ((char*)buf->m_pBuf)[buf->m_nLen - 1] = ']';
//        else if (row <= 0 && buf)
//            buf->Append("]");
//        return true;
//    }
//    bool VerifyEmbeddedCols(const TxnSchema& txn_schema, string& err_desc) {
//        const auto * emb_cols = txn_schema.GetEmbededColByTable(GetTableName());
//        if (emb_cols)
//            return ValidateEmbeddedTblCols(* emb_cols, err_desc);
//        else
//            return true;
//    }
//
//    inline bool ValidateEmbeddedTblCols(const vector<string>& tblCols, string& err_desc) {
//        //Dont need it, when app start, engine will make sure type consistent between dbn table definition and real table
//        //stmt_sptr stmt = CreateStatement(string_format("PRAGMA table_info = '%s'", m_TblName.c_str()));
//        //if (!stmt.get()) {
//        //    err_desc = string_format("Cannot get column info of table:%s. Please check the manifest file.", m_TblName.c_str());
//        //    return false;
//        //}
//
//        //vector<string> fileColumns;
//        //while (sqlite3_step(stmt.get()) == SQLITE_ROW) {
//        //    const char* txt = (const char*)sqlite3_column_text(stmt.get(), 1);
//        //    const char* type = (const char*)sqlite3_column_text(stmt.get(), 2);
//        //    if (txt && type) {
//        //        auto it = m_BinaryFields.find(txt);
//        //        if (it != m_BinaryFields.end()) { //if is blob or file
//        //            fileColumns.push_back(txt);
//        //        }
//        //    }
//        //}
//
//        for (const string& col : tblCols) {
//            if (m_BinaryFields.find(col) == m_BinaryFields.end()) {
//                err_desc = string_format("Cannot get column %s from table:%s. Please check the manifest file.",col.c_str(), m_TblName.c_str());
//                return false;
//            }
//        }
//        return true;
//    }
//
//    bool BindJoinKeysForDetails(vector<SqliteTxnHelper>& dtl_walkers)
//    {
//        if (m_JionKeysPos.size()) {
//            for (auto par_idx = 0; par_idx < m_JionKeysPos.size(); par_idx++) {
//                auto col_id = m_JionKeysPos[par_idx];
//                if (col_id >= 0) {
//                    //first column is ROWID, skip it
//                    auto val = sqlite3_column_value(m_Stmt.get(), col_id + 1);
//                    for (auto& dtl_walker : dtl_walkers) {
//                        int rc = dtl_walker.BindParameter(par_idx + 1, val);
//                        if (rc != SQLITE_OK) {
//                            m_ErrorDesc = sqlite3_errstr(rc);
//                            return false;
//                        }
//                    }
//                }
//            }
//        }
//        return true;
//    }
//    bool StepHdrRec(vector<SqliteTxnHelper>& dtl_walkers,
//        const vector<string>* p_embedded_cols, Buffer& buf, vector<uint64_t>& rowids)
//    {
//        if (!m_Stmt.get()) {
//            return false;
//        }
//        int rc = sqlite3_step(m_Stmt.get());
//        if (SQLITE_ROW == rc) {
//            uint64_t val = (uint64_t)sqlite3_column_int64(m_Stmt.get(), 0);
//            buf.AppendFormat("{\"Header\":{\"Name\":\"%s\",\"Record\":", m_TblName.c_str());
//            AppendOneRow(&buf, p_embedded_cols);
//            rowids.push_back(val);
//			buf.Append("}");
//            if(!BindJoinKeysForDetails(dtl_walkers))
//                return false;
//            return true;
//		}
//		return false;
//    }
//
//	bool StepHdrRec(vector<SqliteTxnHelper>& dtl_walkers,
//        const vector<string>* p_embedded_cols,
//        vector<UploadFile>& files, uint64_t& par_rowid,
//        int hdr_comm_status_idx, string& par_commsStatus )
//    {
//        if (!m_Stmt.get()) {
//            return false;
//        }
//        int rc = sqlite3_step(m_Stmt.get());
//        if (SQLITE_ROW == rc) {
//            uint64_t val = (uint64_t)sqlite3_column_int64(m_Stmt.get(), 0);
//		    par_rowid = val;
//		    par_commsStatus = (const char*)sqlite3_value_text(sqlite3_column_value(m_Stmt.get(), hdr_comm_status_idx));
//		    GetFilesFromRow(files, par_rowid, par_commsStatus, p_embedded_cols);
//            if (!BindJoinKeysForDetails(dtl_walkers))
//                return false;
//            return true;
//        }
//        return false;
//    }
//    bool AppendAllRecordsTo(Buffer* buf, const vector<string>* p_embedded_cols) {
//        if (!m_Stmt.get())
//            return false;
//
//		buf->AppendFormat("{\"Name\":\"%s\",\"Record\":[", m_TblName.c_str());
//		bool has_record = false;
//		while (SQLITE_ROW == sqlite3_step(m_Stmt.get())) {
//			AppendOneRow(buf,  p_embedded_cols);
//			buf->Append(",");
//			has_record = true;
//		}
//		sqlite3_reset(m_Stmt.get());
//		if (has_record)
//			((char*)buf->m_pBuf)[buf->m_nLen - 1] = ']';
//		else
//			buf->Append("]");
//		buf->Append("},");
//        return true;
//    }
//	bool GetAllFiles(vector<UploadFile>& files, uint64_t par_rowid, string par_commsStatus,
//        const vector<string>* p_embedded_cols) {
//        if (!m_Stmt.get())
//            return false;
//		while (SQLITE_ROW == sqlite3_step(m_Stmt.get())) {
//			GetFilesFromRow(files, par_rowid, par_commsStatus, p_embedded_cols);
//		}
//		sqlite3_reset(m_Stmt.get());
//        return true;
//    }
//
//    int BindParameter(int par_idx, sqlite3_value* val) {
//        auto rc = sqlite3_bind_value(m_Stmt.get(), par_idx, val);
//        return rc;
//    }
//};


////check txn schema, still process if detail table or column is defined wrongly.
////check txn data, will abort this txn if anything wrong in retrieving hanging files
//bool Comm2_GetTxnHangingFiles(const std::string& name, const std::string& json_str, vector<UploadFile>& files, string& err_desc)
//{
//    TxnSchema txn_schema;
//    int num_rec = 0;
//    const bool getFilesOnly = true;
//    do {
//        if (!LoadTxnSchema(json_str, txn_schema, err_desc)) {
//            break;
//        }
//        SqliteTxnHelper hdr_walker(txn_schema.HdrTbl, txn_schema.JoinKeys, true, getFilesOnly);
//        int idx_comm_status = 0;
//        if (!hdr_walker.FillAllColumnsInfo(idx_comm_status)) {
//            //err_desc +=string_format("Cannot get column info of table:%s", txn_schema.HdrTbl.c_str());
//            //break;
//            //dont need report such error, because the next call will be maketxn, let maketxn report error
//            return false;
//        }
//
//       //just get error description only, will continue
//        hdr_walker.VerifyEmbeddedCols(txn_schema, err_desc);
//        vector<SqliteTxnHelper> dtl_walkers;
//        for (auto& dtl : txn_schema.DtlTbls) {
//            SqliteTxnHelper dtl_walker(dtl, txn_schema.JoinKeys, false, getFilesOnly);
//            dtl_walker.VerifyEmbeddedCols(txn_schema, err_desc);
//            int dontCare;
//
//            if (dtl_walker.FillAllColumnsInfo(dontCare)) {
//                dtl_walkers.push_back(dtl_walker);
//            }
//            else {
//                //ignore any detail table that we can't retrieve coloumn info from sqlite.
//                //and record any error encountered
//                if (err_desc.length())
//                    err_desc += "\n";
//                 err_desc += dtl_walker.GetErrorDesc();
//                //break;
//            }
//	    }
//         while (true) {
//            uint64_t rowid = 0;
//            string comms_status;
//            const auto * p_embedded_cols = txn_schema.GetEmbededColByTable(hdr_walker.GetTableName());
//            if (!hdr_walker.StepHdrRec(dtl_walkers, p_embedded_cols, files,
//						rowid, idx_comm_status+1, comms_status)) {
//				err_desc += hdr_walker.GetErrorDesc();
//                break;
//            }
//            for (auto& dtl_walker : dtl_walkers) {
//                p_embedded_cols = txn_schema.GetEmbededColByTable(dtl_walker.GetTableName());
//                dtl_walker.GetAllFiles(files, rowid, comms_status, p_embedded_cols);
//                if (dtl_walker.GetErrorDesc().length()) {
//                    err_desc = dtl_walker.GetErrorDesc();
//                    break;
//                }
//            }
//            num_rec++;
//        }
//    } while (0);
//
//    if (err_desc.length()) {
//        //the javascript part will report error, here we just generate error
//	    //if (g_pHttpCommLog != NULL && err_desc.length())
//        //    g_pHttpCommLog->LogFormatMessage(LOG_ERROR_LVL, "Fail to get hanging file for txn(%s): %s",name.c_str(),  err_desc.c_str());
//        return false;
//    }
//	if (files.size()>0)
//        LOG_MSG(LOG_EVENT, "Get %zu hanging Files for txn (%s) ", files.size(), name.c_str() );
//    return true;
//}

//bool Comm2_MakeTxn(const string& strCompany, const string& strAppId, const string& strRefreshToken, unsigned long max_msgsize, const std::string& name,
//    const std::string& json_str, Comm2Txn& txn, string& err_desc)
//{
//    if (max_msgsize == 0 || max_msgsize >= 20 * 1024 * 1024) {
//        max_msgsize = 1024 * 1024;
//    }
//    txn.m_HasNext = false;
//    Buffer data_buffer;
//    Buffer* buf = &data_buffer;
//    TxnSchema txn_schema;
//    int num_rec = 0;
//    do {
//        if (!LoadTxnSchema(json_str, txn_schema, err_desc)) {
//            break;
//        }
//        //dont validate the embedded columns here, the get hanging file already checked it.
//
//        SqliteTxnHelper hdr_walker(txn_schema.HdrTbl, txn_schema.JoinKeys, true, false);
//        vector<SqliteTxnHelper> dtl_walker;
//        for (auto& dtl : txn_schema.DtlTbls) {
//            SqliteTxnHelper txn_dtl(dtl, txn_schema.JoinKeys, false, false);
//            if (!txn_dtl.ExistsTable())
//                continue;
//            dtl_walker.push_back(txn_dtl);
//        }
//
//        Buffer schema_buffer;
//        //int dtlCommsStatusIdx = 0;
//        schema_buffer.AppendFormat("\"Schema\":{ \"Header\":{\"Name\":\"%s\",\"Columns\":", txn_schema.HdrTbl.c_str());
//        if (!hdr_walker.AppendColumns(&schema_buffer, txn_schema)) {
//            err_desc = string_format("Cannot get column info of table:%s", txn_schema.HdrTbl.c_str());
//            break;
//        }
//        schema_buffer.Append("},");
//        schema_buffer.Append("\"Detail\":[");
//        for (auto& dtl_walker : dtl_walker) {
//            schema_buffer.AppendFormat("{\"Name\":\"%s\", \"Columns\":", dtl_walker.GetTableName().c_str());
//            if (!dtl_walker.AppendColumns(&schema_buffer,  txn_schema)) {
//                schema_buffer.Append("[]");
//            }
//            schema_buffer.Append("},");
//        }
//        if (dtl_walker.size()) {
//            ((char*)schema_buffer.m_pBuf)[schema_buffer.m_nLen - 1] = ']';
//            schema_buffer.Append("},");
//        }
//        else {
//            schema_buffer.Append("]},");
//        }
//
//        txn.m_pRowIDs = new vector<uint64_t>();
//        buf->Append("\"Data\":[");
//        do {
//            //{ Header: {Name:, Record:[...]}},
//            //uint64_t rowid = 0;
//            string commsStatus;
//            const auto * p_embedded_cols = txn_schema.GetEmbededColByTable(hdr_walker.GetTableName());
//            if (!hdr_walker.StepHdrRec(dtl_walker, p_embedded_cols,*buf,*txn.m_pRowIDs)) {
//                if (hdr_walker.GetErrorDesc().length()) {
//                    err_desc = hdr_walker.GetErrorDesc();
//                    //err_desc = string_format("Cant find any record for uploading from table %s",
//                    //    hdr_walker.GetTableName().c_str());
//                    goto EXIT;
//                }
//                else {
//                    break;
//                }
//            }
//            buf->Append(", \"Detail\":[");
//            for (auto& dtl_walker : dtl_walker) {
//                //{Name:, Record:[...]},
//                p_embedded_cols = txn_schema.GetEmbededColByTable(dtl_walker.GetTableName());
//                dtl_walker.AppendAllRecordsTo(buf, p_embedded_cols);
//                if (dtl_walker.GetErrorDesc().length()) {
//                    err_desc = dtl_walker.GetErrorDesc();
//                }
//            }
//            if (dtl_walker.size()) {
//                ((char*)buf->m_pBuf)[buf->m_nLen - 1] = ']';
//            }
//            else {
//                buf->Append("]");
//            }
//
//            buf->Append("},");
//            num_rec++;
//        } while (buf->m_nLen < max_msgsize);
//
//        if (!num_rec) {
//            buf->Append("]");
//            goto EXIT;
//        }
//        else {
//            ((char*)buf->m_pBuf)[buf->m_nLen - 1] = ']';
//        }
//
//        time_t now; time(&now);
//        char time_buf[sizeof "1970-01-01T00:00:00.000Z"];
//        strftime(time_buf, sizeof time_buf, "%FT%T.000Z", gmtime(&now));
//
//        txn.m_MsgID = ++GetComm2MsgID();
//        txn.m_HasNext = buf->m_nLen >= max_msgsize;
//        txn.m_pBuf = new Buffer();
//        txn.m_pBuf->AppendFormat(
//            R"xxx({"Comm": {
//    "TenantID":"%s",
//    "AppID" : "%s",
//    "HardwareID" : "%s",
//    "EngVersion" : "%s",
//    "AppVersion" : "%s",
//    "Type" : "TRANSACTION",
//    "Name" : "%s",
//    "MsgID" : %d,
//    "RequestDT": "%s",
//    "RefreshToken":"%s"
//    },
//    "Payload": {)xxx",
//            strCompany.c_str(),
//            strAppId.c_str(),
//            g_pEngine->GetDeviceUUID().c_str(),
//            g_pEngine->GetEngineVerStr().c_str(),
//            g_pEngine->GetR3Rsc()->GetAppVersion(),
//            //np_strupr((char*)name.c_str()),
//            name.c_str(),
//            txn.m_MsgID,
//            time_buf,
//            strRefreshToken.c_str());
//
//        txn.m_pBuf->Append(schema_buffer.m_pBuf, schema_buffer.m_nLen);
//        txn.m_pBuf->Append(data_buffer.m_pBuf, data_buffer.m_nLen);
//        txn.m_pBuf->Append("}"); //end Payload
//        txn.m_pBuf->Append("}"); //end whole
//
//    } while (0);
//EXIT:
//    if (!num_rec || err_desc.length()) {
//        if (txn.m_pBuf) {
//            delete txn.m_pBuf;
//            txn.m_pBuf = NULL;
//        }
//        if (txn.m_pRowIDs) {
//            delete txn.m_pRowIDs;
//            txn.m_pRowIDs = NULL;
//        }
//        //if(g_pHttpCommLog && err_desc.length()) {
//        //   g_pHttpCommLog->LogFormatMessage(LOG_ERROR_LVL, "Fail to compose txn data: %s", err_desc.c_str());
//        //}
//        return false;
//    }
//	if (num_rec>0)
//        LOG_MSG(LOG_EVENT, "Compose Txn(%s) based on %d records", name.c_str(), num_rec);
//    return true;
//}
//
//bool Comm2_CommitTxn(const string& txnName, const string& hdrTable,
//    uint64_t* pRowIDs, size_t numRowID, string statusFlag)
//{
//    //sqlite3_stmt *stmt = nullptr;
//    SqliteTxnHelper helper(hdrTable, statusFlag);
//    return helper.UpdateRows(pRowIDs, numRowID);
//}


class SqliteTblSyncHelper :public SqliteHelper {
    vector<int>    ordinals;
public:
    SqliteTblSyncHelper(rapidjson::Value& header) : SqliteHelper(header["Name"].GetString())
    {}
    bool IsFileTagTable() {
        auto& tableName = this->GetTableName();
        return tableName.length() > 5 &&
            !strncmp("#FILE", tableName.c_str() + tableName.length() - 5, 5);
    }
    std::string GetSQLiteColumnType(const std::string& type, const std::string& length/*"10,3" or "100"*/)
    {
        //        if (type.compare("integer") == 0 || type.compare("boolean") == 0)
        //            return "INTEGER";
        //        else if (type.compare("float") == 0 || type.compare("double") == 0
        //            || type.compare("real") == 0 || type.compare("decimal") == 0)
        //            return "REAL";
        //        if (type.compare("blob") == 0)
        //            return "BLOB";
        //        else
        //            return "TEXT";
        //        integer .   ==> integer
        //        boolean .   ==> boolean(0/1)
        //        float       ==> float
        //        double .    ==> double
        //        real        ==> real
        //        decimal(20,5) ==>decimal(20,5)
        //        date        ==>date(yyyy-mm-dd)
        //        datetime  ==>datetime(yyyy-mm-dd hh:mm:ss:sss)
        //        timestamp  ==>datetime(yyyy-mm-dd hh:mm:ss:sss)
        //        varchar(30) ==>varchar(30) //utf8 format
        //        nvarchar(30) ==>nvarchar(30*4) //utf8 format
        const char* c_type = type.c_str();
        if (_stricmp(c_type, "SHORT") == 0 || _stricmp(c_type, "SMALLINT") == 0)
            return "SMALLINT";
        else if ((_stricmp(c_type, "integer") == 0) || (_stricmp(c_type, "BIGINT") == 0))
            return "BIGINT";
        else if (_stricmp(c_type, "boolean") == 0)
            return "BOOLEAN";
        else if (_stricmp(c_type, "float") == 0)
            return "FLOAT";
        else if (_stricmp(c_type, "double") == 0)
            return "DOUBLE";
        else if (_stricmp(c_type, "real") == 0)
            return "DOUBLE";
        else if (_stricmp(c_type, "decimal") == 0) {
            if (!length.length())
                return "DECIMAL";
            return string_format("DECIMAL(%s)", length.c_str());
        }
        else if (_stricmp(c_type, "date") == 0) {
            return "DATE";
        }
        else if (_stricmp(c_type, "datetime") == 0) {
            return "DATETIME";
        }
        else if (_stricmp(c_type, "timestamp") == 0) {
            return "DATETIME";
        }
        else if (_stricmp(c_type, "varchar") == 0) {
            return string_format("VARCHAR(%s)", length.c_str());
        }
        else if (_stricmp(c_type, "nvarchar") == 0) {
            int n = atoi(length.c_str()) * 4;
            return string_format("NVARCHAR(%d)", n);
        }
        else if (_stricmp(c_type, "blob") == 0)
            return "BLOB";
        else
            return "NVARCHAR(500)";

    }
    static bool IsCompatibleType(const std::string& DbType, const std::string& TblSyncType)
    {
        if (DbType == TblSyncType)
            return true;
        if (DbType == "DATETIME")
            return TblSyncType == "DATE" || TblSyncType == "TIMESTAMP";
        if (DbType == "SMALLINT")
            return TblSyncType == "SHORT";
        if (DbType == "BIGINT" || DbType == "INTEGER")
            return TblSyncType == "INTEGER" || TblSyncType == "SMALLINT" || TblSyncType == "SHORT";
        if (DbType == "DOUBLE")
            return TblSyncType == "FLOAT" || TblSyncType == "REAL" 
                    || TblSyncType == "INTEGER" || TblSyncType == "SMALLINT" || TblSyncType == "SHORT";
        if (DbType == "NVARCHAR" || DbType == "VARCHAR")
            return true;
        if (DbType == "FILE")
            return TblSyncType == "VARCHAR" || TblSyncType == "TEXT";
        return false;
    }
    bool AreCompatibleTypes(const rapidjson::Value& tblColumns, string& errMsg) {
        map<string, string> physicalCols;
        stmt_sptr stmt = CreateStatement(string_format("PRAGMA table_info = [%s]",
            GetTableName().c_str()));
        if (!stmt.get())
            return true; //

        //int row = 0;
        while (sqlite3_step(stmt.get()) == SQLITE_ROW) {
            char* txt = (char*)sqlite3_column_text(stmt.get(), 1);
            string type = np_strupr((char*)sqlite3_column_text(stmt.get(), 2));
            //type.erase(std::remove_if(type.begin(), type.end(), isspace), type.end());
            auto it = std::remove_if(type.begin(), type.end(), [](const char p)->bool {
                return 0 != isspace(p);
                });
            type.erase(it, type.end());
            physicalCols[np_strupr(txt)] = type.substr(0, type.find('('));
        }
        int rc = SQLITE_OK;
        if (tblColumns.IsArray()) {
            /*"Name": "FW_TBL1_DTL2",
             "Columns": [{
             "Name": "TENANT_ID",
             "Type": "NVARCHAR",
             "Length": "100"
             }, {
             "Name": "DIST_CD",
             "Type": "NVARCHAR",
             "Length": "100"
             }*/
			for (rapidjson::SizeType i = 0;rc==SQLITE_OK && i < tblColumns.Size(); i++) {
				const rapidjson::Value& columnDef = tblColumns[i];
				auto colName = np_strupr((char*)(columnDef["Name"].GetString()));
				auto it = physicalCols.find(colName);
				if (it != physicalCols.end()) {
					string syncType = np_strupr((char*)columnDef["Type"].GetString());
                    if (!IsCompatibleType(it->second, syncType)) {
                        errMsg = string_format("The type(%s) of column(%s) of table(%s) doesn't match tablesync type(%s)",
                            it->second.c_str(), colName, GetTableName().c_str(), syncType.c_str());
                            LOG_MSG(LOG_ERROR_LVL, "%s", errMsg.c_str());

                        return false;
                    }
				}
			}
		}
		return rc == SQLITE_OK;

	}

    bool TruncateTable() {
        char* zCreate = sqlite3_mprintf("Delete from  [%s]", GetTableName().c_str());
        int rc = sqlite3_exec(GetSqliteDB(), zCreate, 0, 0, 0);
        bool ret = rc == SQLITE_OK;
        if (!ret)
            m_ErrorDesc = string_format("Fail to truncate table:%s, error:%s", zCreate, sqlite3_errstr(rc));

        sqlite3_free(zCreate);
        return ret;
    }
    bool CreateTableBySchema(rapidjson::Value& tblColumns) {
        char* zCreate = sqlite3_mprintf("CREATE TABLE [%s]", GetTableName().c_str());
        char cSep = '(';
        char cPrmSep = '(';
        if (tblColumns.IsArray()) {
            string primaryKey;
            for (rapidjson::SizeType i = 0; i < tblColumns.Size(); i++) {
                const rapidjson::Value& columnDef = tblColumns[i];
                zCreate = sqlite3_mprintf("%z%c\n  [%s] %s", zCreate, cSep,
                    columnDef["Name"].GetString(),
                    GetSQLiteColumnType(columnDef["Type"].GetString(),
                        columnDef["Length"].GetString()).c_str());
                cSep = ',';
                if (/*_stricmp("ID", columnDef["Name"].GetString()) == 0 ||*/
                    (columnDef.HasMember("Attribute") && columnDef["Attribute"] == "P")) {
                    primaryKey += cPrmSep;
                    cPrmSep = ',';
                    primaryKey.append(columnDef["Name"].GetString());
                }
            }
            if (primaryKey.length())
                zCreate = sqlite3_mprintf("%z, PRIMARY KEY%s)", zCreate, primaryKey.c_str());

        }
        if (cSep == '(') {
            sqlite3_free(zCreate);
            m_ErrorDesc = string_format("Can not create table %s as the column is empty", m_TblName.c_str());
            return false;
        }
        zCreate = sqlite3_mprintf("%z \n)", zCreate);

        int rc = sqlite3_exec(GetSqliteDB(), zCreate, 0, 0, 0);
        bool ret =(rc == SQLITE_OK);
        if (!ret)
            m_ErrorDesc = string_format("Fail to create table:%s, error:%s", zCreate, sqlite3_errstr(rc));
        //g_pEngine->GetAppLog()->LogFormatMessage(LOG_ERROR, "Fail to create table:%s", zCreate);

        sqlite3_free(zCreate);
        return ret;
    }

    bool MarkNonExistedColumn(rapidjson::Value& tblColumns, rapidjson::Document::AllocatorType& allocator,
        bool& bSomethingWrong, string& errMsg) {

        map<string, bool> physicalCols;
        stmt_sptr stmt = CreateStatement(string_format("PRAGMA table_info = [%s]",
            GetTableName().c_str()));
        if (!stmt.get())
            return false;

        while (sqlite3_step(stmt.get()) == SQLITE_ROW) {
            char* txt = (char*)sqlite3_column_text(stmt.get(), 1);
            bool pk = sqlite3_column_int(stmt.get(), 5) >= 1;
            physicalCols[np_strupr(txt)] = pk;
        }
        int rc = SQLITE_OK;
        if (tblColumns.IsArray()) {
            /*"Name": "FW_TBL1_DTL2",
             "Columns": [{
             "Name": "TENANT_ID",
             "Type": "NVARCHAR",
             "Length": "100"
             }, {
             "Name": "DIST_CD",
             "Type": "NVARCHAR",
             "Length": "100"
             }*/
            for (rapidjson::SizeType i = 0; rc == SQLITE_OK && i < tblColumns.Size(); i++) {
                rapidjson::Value& columnDef = tblColumns[i];
                auto colName = np_strupr((char*)(columnDef["Name"].GetString()));
                bool isPrimaryKey = columnDef.HasMember("Attribute") && columnDef["Attribute"] == "P";
                auto it = physicalCols.find(colName);
                if (it != physicalCols.end()) {
                    if (it->second != isPrimaryKey ) {
                        LOG_MSG(LOG_WARNING, "column(%s) in table(%s) is primary key, but it is not so in sqlite table"
                            , colName, GetTableName().c_str());
                    }
                }
                else {
                    columnDef.AddMember("__removed", rapidjson::Value(true), allocator);
                    bSomethingWrong = true;
                    LOG_MSG(LOG_WARNING, "found extra column(%s) defined in manifest table(%s)",
                            colName, GetTableName().c_str());
                    /*char* zCreate = sqlite3_mprintf("alter TABLE '%s' add column '%s' %s",
                        GetTableName().c_str(), colName,
                        GetSQLiteColumnType(columnDef["Type"].GetString(),
                                            columnDef["Length"].GetString()).c_str());
                    rc = sqlite3_exec(GetSqliteDB(), zCreate, 0, 0, 0);
                    if (rc != SQLITE_OK)
                        g_pEngine->GetAppLog()->LogFormatMessage(LOG_ERROR, "Fail to alter table:%s", zCreate);
                    sqlite3_free(zCreate);
                    */
                }
            }
        }
        return rc == SQLITE_OK;
    }

    bool AddRecords(rapidjson::Value& columns, rapidjson::Value& records, bool bInsertOnly)
    {
        string query = string_format("INSERT INTO [%s]", GetTableName().c_str());
        char cSep = '(';

        vector<string> primaryKeys;
        for (rapidjson::SizeType i = 0; i < columns.Size(); i++) {

            const rapidjson::Value& columnDef = columns[i];
            if (columnDef.HasMember("__removed"))
                continue;
            auto colName = columnDef["Name"].GetString();
            query += cSep;
            query.append(colName);
            cSep = ',';

            if (columnDef.HasMember("Attribute") && (columnDef["Attribute"] == "P")) {
                primaryKeys.push_back(columnDef["Name"].GetString());
            }
        }
        query += ") VALUES";
        cSep = '(';
        bool hasValidColumns = false;
        for (rapidjson::SizeType i = 0; i < columns.Size(); i++) {
            const rapidjson::Value& columnDef = columns[i];
            if (columnDef.HasMember("__removed"))
                continue;
            query += cSep;
            query += '?';
            cSep = ',';
            hasValidColumns = true;
        }
        query += ")";
        if (!hasValidColumns)
            return true;
        if (!bInsertOnly) {
            query.append(" ON CONFLICT");
            cSep = '(';
            for (int i = 0; i < primaryKeys.size(); i++) {
                query += cSep;
                query += primaryKeys[i];
                cSep = ',';
            }
            
            string update;
            cSep = ' ';
            for (rapidjson::SizeType i = 0; i < columns.Size(); i++) {
                const rapidjson::Value& columnDef = columns[i];
                if (columnDef.HasMember("__removed"))
                    continue;
                auto colName = columnDef["Name"].GetString();

                if (std::find(primaryKeys.begin(), primaryKeys.end(), colName) == primaryKeys.end()) {
                    update += cSep;
                    update.append(colName);
                    update.append("=excluded.");
                    update.append(colName);
                    cSep = ',';
                }
            }
            if (update.length() > 0)
                query.append(") DO UPDATE SET ").append(update);
            else
                query.append(") DO NOTHING");
        }
        m_Stmt = CreateStatement(query);
        auto pStmt = m_Stmt.get();
        if (!pStmt) {
            LOG_MSG(LOG_ERROR_LVL, "Cannot create insert statement %s, error:%s",
                query.c_str(), m_ErrorDesc.c_str());
            return false;
        }
        //sqlite3_exec(GetSqliteDB(), "BEGIN", 0, 0, 0);
        //int rc = SQLITE_OK;

        bool good = false;
        for (rapidjson::SizeType r = 0; r < records.Size(); r++) {
            auto& rec = records[r];
            auto recSize = std::min(columns.Size(), rec.Size());
            int colBind = 0;
            for (rapidjson::SizeType c = 0; c < recSize; c++) {
                const rapidjson::Value& columnDef = columns[c];
                if (columnDef.HasMember("__removed")) {
                    continue;
                }
                auto& v = rec[c];
                //The leftmost SQL parameter has an index of 1
                colBind += 1;
                switch (v.GetType()) {
                case rapidjson::Type::kStringType:
                    sqlite3_bind_text(pStmt, colBind, v.GetString(), -1, SQLITE_TRANSIENT);
                    break;
                case rapidjson::Type::kNumberType:
                    if (v.IsInt())
                        sqlite3_bind_int(pStmt, colBind, v.GetInt());
                    else	if (v.IsDouble() || v.IsFloat())
                        sqlite3_bind_double(pStmt, colBind, v.GetDouble());
                    else if (v.IsInt64())
                        sqlite3_bind_int64(pStmt, colBind, v.GetInt64());
                    break;
                case rapidjson::Type::kTrueType:
                    //sqlite3_bind_int(pStmt, c, 0);
                    sqlite3_bind_text(pStmt, colBind, "true", 4, SQLITE_STATIC);
                    break;
                case rapidjson::Type::kFalseType:
                    //sqlite3_bind_int(pStmt, c, 0);
                    sqlite3_bind_text(pStmt, colBind, "false", 5, SQLITE_STATIC);
                    break;
                case rapidjson::Type::kNullType:
                case rapidjson::Type::kObjectType:
                case rapidjson::Type::kArrayType:
                    sqlite3_bind_null(pStmt, colBind);
                    break;
                }
            }
            sqlite3_step(pStmt);
            int rc = sqlite3_reset(pStmt);
            good = (rc == SQLITE_OK);
            if (!good) {
                m_ErrorDesc = string_format("TblSync Failed to insert record to table(%s): %s\n",
                    GetTableName().c_str(), sqlite3_errstr(rc));
                break;
            }
        }

        //if (rc == SQLITE_OK)
        if (good) {
            //sqlite3_exec(GetSqliteDB(), "COMMIT", 0, 0, 0);
            if (records.Size() > 0)
                LOG_MSG(LOG_EVENT, "insert/update %d records for table %s",
                    records.Size(), GetTableName().c_str());
        }
        /*
        else
            sqlite3_exec(GetSqliteDB(), "ROLLBACK", 0, 0, 0);
        */

        return good;
    }

    SqliteTblSyncHelper(const string& tbl_name, const string& column_name) :SqliteHelper(tbl_name) {
        string query = string_format("update [%s] set %s=? where %s=?", tbl_name.c_str(), column_name.c_str(), column_name.c_str());
        m_Stmt = CreateStatement(query);
    }

    bool UpdateRows(vector<string> ids, vector<string> filenames, vector<string> columns, size_t size) {
        auto pStmt = m_Stmt.get();
        if (!pStmt)
            return false;
        //int needCommit = sqlite3_get_autocommit(GetSqliteDB());
        //if (needCommit)
        sqlite3_exec(GetSqliteDB(), "BEGIN", 0, 0, 0);
        int rc = SQLITE_OK;

        for (auto i = 0; i < size; ++i) {
            //sqlite3_bind_text(pStmt, 1, columns[i].c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(pStmt, 1, filenames[i].c_str(), -1, SQLITE_TRANSIENT);
            //sqlite3_bind_text(pStmt, 3, columns[i].c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(pStmt, 2, ids[i].c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_step(pStmt);
            rc = sqlite3_reset(pStmt);
            if (rc != SQLITE_OK) {
                m_ErrorDesc = string_format("CommitTblSync failed: %s\n", sqlite3_errstr(rc));
                break;
            }
        }

        //        for (auto i = 0; i < numRowID;++i) {
        //            uint64_t rowid = pRowIDs[i];
        //            sqlite3_bind_int64(pStmt, 1, rowid);
        //            sqlite3_step(pStmt);
        //            rc = sqlite3_reset(pStmt);
        //            if (rc != SQLITE_OK) {
        //                m_ErrorDesc=string_format("CommitTxn failed: %s\n", sqlite3_errmsg(GetSqliteDB()));
        //                break;
        //            }
        //        }
                //if (needCommit) {
        if (rc == SQLITE_OK)
            sqlite3_exec(GetSqliteDB(), "COMMIT", 0, 0, 0);
        else
            sqlite3_exec(GetSqliteDB(), "ROLLBACK", 0, 0, 0);
        //}
        return (rc == SQLITE_OK);
    }
};
string Comm2_ProcessTblSync(const string& fileName, bool dryRun)
{

    bool hasWarningInfo = false;
    string errMsg;
    auto astr_file_name= GetAbsPath(fileName);
    CFTMMapFileImpl mmap_file(astr_file_name.c_str());
    char* data = (char*)mmap_file.fAddr;
    auto len = mmap_file.fSize;
    if (data == NULL || len == 0) {
        return "";
    }
    Document document;
    document.Parse(data, len);
    
    //either response or payload
    
    //"Respone":{ "Status": "FAIL"/"OK"},
    if (document.HasMember("Response")) {
#ifndef PRODUCTION
        //change the "FAIL" rsp to "BYPASS", so upper layer can continue
        auto& rsp = document["Response"];
        if (!rsp.HasMember("Status"))
            return data;
        auto& status = rsp["Status"];
        if (status.IsString() && strcmp(status.GetString(), "FAIL") == 0) {
            rsp.RemoveMember("Status");
            rsp.AddMember("Status", "BYPASS", document.GetAllocator());
            StringBuffer sbuffer;
            Writer<StringBuffer> writer(sbuffer);
            document.Accept(writer);
            return sbuffer.GetString();

        }
#endif
        return data;
    }
    //check payload format Payload:{ "Schema": ..., "Data"...}
/*
"Payload": {
       "Schema": [
           {
               "Name": "M_PRD",
               "Columns": [
                   {
                       "Name": "ID",
                       "Type": "text",
                       "Length": "100",
                       "Attribute": "P"
                   },
                   {
                       "Name": "DISTRIBUTION_BASE_CODE",
                       "Type": "text",
                       "Length": "100"
                   } ...
               ]
           },
           {
               "Name": "M_PRDx",
               "Columns": [
                   {
                       "Name": "ID",
                       "Type": "text",
                       "Length": "100",
                       "Attribute": "P"
                   },
               ]
           },
           {
            "Name": "M_CUST#FILE",
            "Columns": [
                {
                    "Name": "ID",
                    "Type": "text",
                    "Length": "100",
                    "Attribute": "P"
                },
                {
                    "Name": "URL",
                    "Type": "text",
                    "Length": "100"
                },
                {
                    "Name": "FILE_NAME",
                    "Type": "text",
                    "Length": "100"
                },
                {
                    "Name": "FILE_TYPE",
                    "Type": "text",
                    "Length": "100"
                },
                {
                    "Name": "FILE_SIZE",
                    "Type": "integer",
                    "Length": "100"
                },
                {
                    "Name": "DESCRIPTION",
                    "Type": "text",
                    "Length": "100"
                },
                {
                    "Name": "COLUMN_NAME",
                    "Type": "text",
                    "Length": "100"
                }
             ]
          }
       ], //end of schema
       "Data": [
          {
              "Name": "M_PRD",
              "SyncMethod": "Refresh", //"RefreshAll"
              "Record": [
                  [
                      "D34A04AD:F9F9FB02-D783-4E36-A94A-5C5D7A449246",
                      null,
                      "B3EA05F1:B9BBEA9B-7BD4-4288-A017-E758BAD053CB",
                      null,
                      "60006",
                      "TestProd",
                      null,
                      null,
                      "O",
                  ]
              ]
           },
           {
              "Name": "M_PRDx",
              "SyncMethod": "Refresh", //"RefreshAll"
              "Record": [
                  [
                      "D34A04AD:F9F9FB02-D783-4E36-A94A-5C5D7A449246",
                      null,
                      "B3EA05F1:B9BBEA9B-7BD4-4288-A017-E758BAD053CB",
                      null,
                      "60006",
                      "TestProd",
                      null,
                      null,
                      "O",
                  ]
              ]
           },
           {
                 "Name": "M_CUST#FILE",
                 "SyncMethod": "Refresh",
                 "Record": [
                     [
                         "795FD9BB:383DA764-6B98-44C0-9286-11B1B0B7A441",
                         "https://objectstore-svc-extDemo.cfapps.jp10.hana.ondemand.com/api/v1.0/download/storage/product/PICTURE/empty-shop-front-vector-9560895-1578378693292.jpg",
                         "empty-shop-front-vector-9560895.jpg",
                         "image/jpeg",
                         "90.544",
                         "Store Shop Front",
                         "PICTURE"
                     ],
                     [
                         "795FD9BB:56987684-BEDF-4225-9624-C0521D1C04B2",
                         "https://objectstore-svc-extDemo.cfapps.jp10.hana.ondemand.com/api/v1.0/download/storage/product/PICTURE/10955-2-1575519772747.jpg",
                         "10955-2.jpg",
                         "image/jpeg",
                         "321.472",
                         "",
                         "PICTURE"
                     ],
                    ]
       
*/
    
    
    if (!document.HasMember("Payload"))
        return "";

    auto& payload = document["Payload"];
    if (!payload.HasMember("Schema"))
        return "";

    auto& schema = payload["Schema"];
    if (!schema.IsArray())
        return "";
    if (!payload.HasMember("Data"))
        return data;
    auto& dataNode = payload["Data"];
    if (!dataNode.IsArray())
        return "";
    bool hasFileTagTable = false;

    // Extract sync method from data
    map<string, string> tblSyncMethod;
    for (rapidjson::SizeType i = 0; i < dataNode.Size(); i++) {
        rapidjson::Value& tblNode = dataNode[i];
        if (tblNode.HasMember("Name") && tblNode.HasMember("SyncMethod")) {
            string tableName = tblNode["Name"].GetString();
            string syncMethod = tblNode["SyncMethod"].GetString();
            tblSyncMethod[tableName] = syncMethod;
        }
    }

    if (dryRun) {
        // to return #FILE records
        rapidjson::Document tableRecords;
        tableRecords.SetObject();

        for (rapidjson::SizeType ii = 0; ii < schema.Size(); ii++) {
            rapidjson::Value& schemaDef = schema[ii];
            if (!schemaDef.HasMember("Name"))
                continue;

            rapidjson::Value& schemaColumns = schemaDef["Columns"];
            SqliteTblSyncHelper tblsync(schemaDef);
 
            if (!tblsync.IsFileTagTable() && !tblsync.ExistsTable()) 
                tblsync.CreateTableBySchema(schemaColumns);

            if (tblsync.IsFileTagTable()) {
                // Process data
                for (rapidjson::SizeType j = 0; j < dataNode.Size(); j++) {
                    rapidjson::Value& tblNode = dataNode[j];
                    //find the corresponding data by table name.
                    if (tblNode.HasMember("Name") &&
                        0 == _stricmp(tblNode["Name"].GetString(), tblsync.GetTableName().c_str()))
                    {
                        if (tblNode.HasMember("Record")) {
                            string tableName = tblNode["Name"].GetString();
                            rapidjson::Value& records = tblNode["Record"];
                            rapidjson::Value recordsArray(rapidjson::kArrayType);
                            recordsArray.SetArray();
                            for (rapidjson::SizeType r = 0; r < records.Size(); r++) {
                                auto& rec = records[r];
                                rapidjson::Value rowObject;
                                rowObject.SetObject();
                                //Value syncMetholdCol("SyncMethod", document.GetAllocator());
                                Value syncMethodValue(tblSyncMethod[tblsync.GetTableName().c_str()].c_str(), document.GetAllocator());
                                rowObject.AddMember("SyncMethod", syncMethodValue, document.GetAllocator());
                                for (rapidjson::SizeType v = 0; v < schemaColumns.Size(); v++) {
                                    rapidjson::Value& columnDef = schemaColumns[v];
                                    if(!columnDef.HasMember("Name"))
                                        continue;
                                    rapidjson::Value& colName = columnDef["Name"];

                                    rapidjson::Value& value = rec[v];
                                    if (value.IsString() && colName.IsString()) {
                                        //AddMember will move the data in colName and value to rowObject,
                                        //but colName will be used in next loop,
                                        //so must make a copy of those parameters
                                        //rowObject.AddMember(colName, value, document.GetAllocator());

                                        auto strColName = colName.GetString();
                                        auto strValue = value.GetString();
                                        rapidjson::Value rjColName(strColName, document.GetAllocator());
                                        rapidjson::Value rjValue(strValue, document.GetAllocator());

                                        rowObject.AddMember(rjColName, rjValue, document.GetAllocator());
                                    }
                                    
                                }
                                recordsArray.PushBack(rowObject, document.GetAllocator());
                            }
                            string subStrTableName = tableName.substr(0, tableName.length() - 5);
                            Value tableNameValue(subStrTableName.c_str(), document.GetAllocator());
                            tableRecords.AddMember(tableNameValue, recordsArray, document.GetAllocator());
                            hasFileTagTable = true;
                        }
                    }
                }
            }
        }
        if (hasFileTagTable)
            document.AddMember("FileRecords", tableRecords, document.GetAllocator());

//        document.AddMember("ProcessTables", processTables, document.GetAllocator());
    }
    else {
        // Process schema
        for (rapidjson::SizeType i = 0; i < schema.Size(); i++) {
            rapidjson::Value& schemaDef = schema[i];
            if (!schemaDef.HasMember("Name"))
                continue;

            rapidjson::Value& schemaColumns = schemaDef["Columns"];
            SqliteTblSyncHelper tblsync(schemaDef);
            //g_pHttpCommLog->LogFormatMessage(LOG_WARNING, "processing  table(%s)", tblsync.GetTableName().c_str());
            //bool schemaPass = false;
            if (!tblsync.IsFileTagTable()) {
                if (tblsync.ExistsTable()) {
                    if (!tblsync.AreCompatibleTypes(schemaColumns, errMsg)) {
#ifdef  PRODUCTION
                        return "";
#else
                        hasWarningInfo = true;
                        continue;
#endif
                    }
                    auto& allocator = document.GetAllocator();
                    //bool hasInconsistentPK = false;
                    //tblsync.MarkNonExistedColumn(schemaColumns, allocator, hasWarningInfo, hasInconsistentPK);
                    tblsync.MarkNonExistedColumn(schemaColumns, allocator,hasWarningInfo, errMsg);
#ifdef PRODUCTION
                    //if (hasInconsistentPK)
                    if (errMsg.length())
                        return "";
#endif
                    if (tblSyncMethod[tblsync.GetTableName().c_str()] == "Refresh") {
                        tblsync.TruncateTable();
                    }
                }
                //#ifndef NDEBUG
#if 0
                //just for test
                else
                    tblsync.CreateTableBySchema(schemaColumns);
#else
                else {
                    hasWarningInfo = true;
                    errMsg = string_format("Cannot find table(%s) from app file", tblsync.GetTableName().c_str());
                    LOG_MSG(LOG_WARNING, "%s", errMsg.c_str());
                    continue;
                }
#endif       
            }
            // Process data
            for (rapidjson::SizeType k = 0; k < dataNode.Size(); k++) {
                rapidjson::Value& tblNode = dataNode[k];
                //find the corresponding data by table name.
                if (tblNode.HasMember("Name") &&
                    0 == _stricmp(tblNode["Name"].GetString(), tblsync.GetTableName().c_str()))
                {
                    bool bInsertOnly = tblSyncMethod[tblsync.GetTableName().c_str()] == "Refresh";
                    if (tblNode.HasMember("Record")) {
                        string tableName = tblNode["Name"].GetString();
                        rapidjson::Value& records = tblNode["Record"];
                        if (!tblsync.IsFileTagTable()) {
                            tblsync.AddRecords(schemaColumns, records, bInsertOnly);
                            break;
                        }
                    }
                }
            }
        }
    }
    document.RemoveMember("Payload");
    if (errMsg.length()) {
        //document.AddMember("Error", true, document.GetAllocator());
        Value stringValue(errMsg.c_str(), document.GetAllocator());
        document.AddMember("Error",stringValue, document.GetAllocator());
    }
    //if(warning.length())
    //	document.AddMember("Warning", warning.c_str(), document.GetAllocator());
    StringBuffer sbuffer;
    Writer<StringBuffer> writer(sbuffer);
    document.Accept(writer);
    return sbuffer.GetString();
}

//
//static map<std::string,bool> s_SmartPendingTxnTables;
//static bool s_bSmartTxnTimer = false;
//
//void np_update_txn_flag(sqlite3_context* context, int argc, sqlite3_value** argv)
//{
//    if(argc != 2){
//        sqlite3_result_error(context, "bad parameter count in 'np_update_txn_flag', only 2 parameters allowed", -1);
//        return;
//    }
//    const unsigned char* tbl_name = sqlite3_value_text(argv[0]);
//    const unsigned char* comm_status_flag= sqlite3_value_text(argv[1]);
//    if(!comm_status_flag || comm_status_flag[0] != 'P'){
//        sqlite3_result_int(context, 0);
//       return ;
//    }
//    s_SmartPendingTxnTables[(const char*)tbl_name] = true;
//    sqlite3_result_int(context, 1);
//    if(s_bSmartTxnTimer)
//        return;
//    //LOGX("calling np_update_txn_flag %s, %s\n", tbl_name, comm_status_flag);
//    //if(g_pHttpCommLog)
//        //g_pHttpCommLog->LogMessage(
//    s_bSmartTxnTimer = true;
//    string cmd = "__HttpCommSmartTxnUpload();";
//    GetJSEnv().JSEvaluateScriptGlobally2(cmd.c_str(),cmd.length(), "smart_txn_upload");
//
//}
//string Comm2_GetAndResetSmartTxnTables(bool bClearTables){
//    string ret ;
//    auto it=s_SmartPendingTxnTables.begin();
//    if(it!=s_SmartPendingTxnTables.end()){
//        ret = it->first;
//        ++it;
//    }
//
//    for( ;it!= s_SmartPendingTxnTables.end();++it ){
//        ret +="|";
//        ret +=it->first;
//    }
//    if(bClearTables)
//        s_SmartPendingTxnTables.clear();
//    s_bSmartTxnTimer = false;
//    return ret;
//}
//void RegistorUDF(DBN * psDBN)
//{
//    if(!psDBN || !psDBN->m_pDBConnection)
//        return;
//    auto db = psDBN->m_pDBConnection->get_DB();
//    sqlite3_create_function(db, "np_update_txn_flag", 2, SQLITE_UTF8|SQLITE_DETERMINISTIC, 0, np_update_txn_flag, 0, 0);
//}
//void InstallTriggerForTxnUploading(DBN * psDBN, bool bInstall)
//{
//    if(!psDBN || !psDBN->m_pDBConnection)
//        return;
//
////    //drop trigger
//    auto SQL= "select name from sqlite_temp_master where type = 'trigger' and name like 'HTTPCOMM_HELP_%'";
//    unique_ptr<NgmTable> pTable(psDBN->m_pDBConnection->select2(SQL));
//    if(pTable.get() && pTable->rows.size()>0) {
//        for(int i=0;i<pTable->rows.size();++i){
//            string sql= string_format("drop trigger %s;", pTable->rows[i]->values[0].field->ToString().c_str());
//            psDBN->m_pDBConnection->exec2(sql.c_str());
//        }
//    }
////    psDBN->m_pLog->LogFormatMessage(LOG_EVENT, "test");
////    psDBN->m_pDBConnection->exec2("begin");
////    for(int i=0;i<10;i++){
////        psDBN->m_pLog->LogFormatMessage(LOG_EVENT, "rename tbl 1");
////
////        string sql= string_format("alter table M_PRD rename to M_PRD_ABC");
////        psDBN->m_pDBConnection->exec2(sql.c_str());
////        psDBN->m_pLog->LogFormatMessage(LOG_EVENT, "rename tbl 2");
////        sql= string_format("alter table M_PRD_ABC rename to M_PRD");
////        psDBN->m_pDBConnection->exec2(sql.c_str());
////        psDBN->m_pLog->LogFormatMessage(LOG_EVENT, "rename tbl 3");
////    }
////    psDBN->m_pDBConnection->exec2("commit");
////    psDBN->m_pLog->LogFormatMessage(LOG_EVENT, "test done");
//
//    if(!bInstall)
//        return ;
//    //create trigger
//    string tbls= GetManifestTxnTables();
//    for_each_string_by_delimiter(tbls, '|',[psDBN](const string& str) {
//        //if(!psDBN->m_pDBConnection->existsTable(str.c_str()))
//        //    return;
//        auto sql= string_format("create temp trigger HTTPCOMM_HELP_I_%s insert on main.%s when new.COMMS_STATUS='P' "
//                                "begin "
//                                "select np_update_txn_flag('%s',new.COMMS_STATUS); "
//                                "end;", str.c_str(),str.c_str(),str.c_str());
//        psDBN->m_pDBConnection->exec2(sql.c_str());
//        sql= string_format("create temp trigger HTTPCOMM_HELP_U_%s update of COMMS_STATUS on main.%s when new.COMMS_STATUS='P' "
//                           "begin "
//                           "select np_update_txn_flag('%s',new.COMMS_STATUS); "
//                           "end;", str.c_str(),str.c_str(),str.c_str());
//        psDBN->m_pDBConnection->exec2(sql.c_str());
//
//    });
////    SQL= "delete from NPENGINE_CONFIG where KEY='MANIFEST_VERSION'";
////    bool bRet = psDBN->m_pDBConnection->exec2(SQL);
////    if(!bRet)
////        return;
////    SQL= "insert into NPENGINE_CONFIG values('MANIFEST_VERSION',?)";
////    bRet = psDBN->m_pDBConnection->exec2(SQL, manifestVersion);
////    if(!bRet)
////        return;
//}
//void Comm2_EnableSmartTxnUploading(bool bEnabled)
//{
//    InstallTriggerForTxnUploading(connect, bEnabled);
//}
}
#endif