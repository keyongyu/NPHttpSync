import {TurboModule, TurboModuleRegistry} from 'react-native';
export interface IHttpResponseErr {
  req_id: string;
  type: "RESULT_ERR"
  error_code: number; //only if type == "RESULT_ERR"
  error_desc: string; //only if type == "RESULT_ERR"
}
export interface IHttpResponseRsp {
  req_id: string;
  type:  "RESULT_RSP"
  rsp_header: Object; //"HEADER_READY" or "RESULT_RSP"
  rsp_code: number;   //only when type is "RESULT_RSP"
  rsp_data: string;      //only when type is "RESULT_RSP", will be file name if mode is file
}
export interface IHttpResponseHdrReady {
  req_id: string;
  type: "HEADER_READY"
  rsp_header: Object;
  done?: number;       //only if type == "sending"/"receiving"
  total?: number;      //only if type == "sending"/"receiving"
}
export interface IHttpResponseProgress {
  req_id: string;
  type:  "SENDING" | "RECEIVING";
  done?: number;       //only if type == "sending"/"receiving"
  total?: number;      //only if type == "sending"/"receiving"
}
export type IHttpResponse = IHttpResponseErr|IHttpResponseRsp|IHttpResponseProgress|IHttpResponseHdrReady;

// export interface IHttpResponse {
//     req_id: string;
//     type: "RESULT_ERR" | "RESULT_RSP" | "HEADER_READY" | "SENDING" | "RECEIVING";
//     error_code?: number; //only if type == "RESULT_ERR"
//     error_desc?: string; //only if type == "RESULT_ERR"
//     rsp_header?: Object; //"HEADER_READY" or "RESULT_RSP"
//     rsp_code?: number;   //only when type is "RESULT_RSP"
//     rsp_data?: string;      //only when type is "RESULT_RSP", will be file name if mode is file
//     done?: number;       //only if type == "sending"/"receiving"
//     total?: number;      //only if type == "sending"/"receiving"
// }

export type SendHttpRequestCB_t = (rsp: IHttpResponse) => void;
export type HttpMethod="GET"|"PUT"|"POST";

export type FileRecU = {
  fileName:string;
  columnName:string;
  commsStatus:string;
  table:string;
  rowid:number;
  rowidHi:number;

  //used by app
  strRowID?:string;
  fileID?:string;
  LogicID?:string;
  shortUrl?:string;
  txnDefName?:string;
  headerName?:string;
  numAttempts?:number;
  msToRetry?:number;
}
// export type TxnBulkObj={
//   hasError:boolean,
//   errorMsg?:string,
//   hasNext?:boolean,
//   byteArray?:Uint8Array,
//   bufferPtr?:Uint8Array,//should not change any content of this field
//   msgID?:number,
//   rowIDs?:Uint8Array,
// };

export interface Spec extends TurboModule {
  readonly reverseString: (input: string) => string;
  //readonly reverseStringFromJava: (input: string) => string;
  readonly echoFromCpp:  (id:string, cb:(text:string)=>void ) => void;
  readonly callPromise:  (id:string) => Promise<string> ;



  readonly SendHttpRequestStr: (cb: SendHttpRequestCB_t, reqId: string,
      method: HttpMethod, url: string, header: string,
      content: string, savedFileName/*don't save file if empty*/: string, nTimeoutMs?:number)=>void;
  readonly SendHttpRequestBlob: (cb: SendHttpRequestCB_t, reqId: string,
      method: HttpMethod, url: string, header: string,
      content: Object, savedFileName: string, nTimeoutMs?:number)=>void;
  readonly LoadFile:(fileName:string, maxBytes?:number)=>string;
  readonly WriteFile:(file: string, content: string, mode: string)=>boolean;
  readonly AppendFile:(dstFile: string, srcFile: string)=>boolean;
  readonly DeleteFile:(file: string)=>boolean;
  readonly MoveFile:(srcFile: string, dstFile:string, overwrite?:boolean )=>boolean;

  readonly Exists:(file: string)=>boolean;
  readonly DeleteFileAll:(folder: string, wild:string)=>void;
  readonly DeleteFolder:(folder: string)=>void;

  readonly SetWorkDir:(folder: string)=>void;
  readonly Comm2ProcessTblSync:(fileName:string, dryRun:boolean)=>string;
  readonly SQLBeginTransaction:()=>void;
  readonly SQLCommit:(commit:boolean)=>void;

  //null, {hasError:true, errorMsg:""} or {hasNext:true/false, byteArray:,msgID:555, rowIDs: }
  readonly __Comm2MakeTxn:(companyID:string, appID:string, refreshToken:string,
                           maxMsgSize:number, txnName:string, clientSchema:string)=>Object/*TxnBulk*/;

  readonly __Comm2CommitTxn:(txnName:string, hdrTblName:string, txnBlk:Object,commStatus:string)=>void;

  readonly __Comm2GetTxnHangingFiles:(txnName:string, clientSchema:string )=>
                          {hasError:boolean;errorMsg?:string,arrayFiles:FileRecU[]};

  //readonly TestSqliteDB:(db: Object)=>void;
}

export default TurboModuleRegistry.getEnforcing<Spec>(
  'NativeNPSync',
);
