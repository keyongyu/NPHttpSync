import {TurboModule, TurboModuleRegistry} from 'react-native';
export interface IHttpResponse {
    req_id: string;
    type: "RESULT_ERR" | "RESULT_RSP" | "HEADER_READY" | "SENDING" | "RECEIVING";
    error_code?: number; //only if type == "RESULT_ERR"
    error_desc?: string; //only if type == "RESULT_ERR"
    rsp_header?: Object; //"HEADER_READY" or "RESULT_RSP"
    rsp_code?: number;   //only when type is "RESULT_RSP"
    rsp_data?: string;      //only when type is "RESULT_RSP", will be file name if mode is file
    done?: number;       //only if type == "sending"/"receiving"
    total?: number;      //only if type == "sending"/"receiving"
}

export type SendHttpRequestCB_t = (rsp: IHttpResponse) => void;
export type HttpMethod="GET"|"PUT"|"POST";




export interface Spec extends TurboModule {
  readonly reverseString: (input: string) => string;
  //readonly reverseStringFromJava: (input: string) => string;
  readonly echoFromCpp:  (id:string, cb:(text:string)=>void ) => void;
  readonly callPromise:  (id:string) => Promise<string> ;



  readonly SendHttpRequest: (cb: SendHttpRequestCB_t, reqId: string,
      method: HttpMethod, url: string, header: string,
      content: string, savedFileName: string, nTimeoutMs?:number)=>void;
  readonly SendHttpRequestBlob: (cb: SendHttpRequestCB_t, reqId: string,
      method: HttpMethod, url: string, header: string,
      content: Object, savedFileName: string, nTimeoutMs?:number)=>void;
  readonly LoadFile:(fileName:string, maxBytes?:number)=>string;
  readonly WriteFile:(file: string, content: string, mode: string)=>boolean;
  readonly DeleteFile:(file: string)=>boolean;
  readonly MoveFile:(srcFile: string, dstFile:string, overwrite?:boolean )=>boolean;

  readonly Exists:(file: string)=>boolean;
  readonly DeleteFileAll:(folder: string, wild:string)=>void;
  readonly DeleteFolder:(folder: string)=>void;

  readonly SetWorkDir:(folder: string)=>void;
  readonly Comm2ProcessTblSync:(fileName:string, dryRun:boolean)=>string;
  readonly SQLBeginTransaction:()=>void;
  readonly SQLCommit:(rollback:boolean)=>void;

  //readonly TestSqliteDB:(db: Object)=>void;
}

export default TurboModuleRegistry.getEnforcing<Spec>(
  'NativeNPSync',
);
