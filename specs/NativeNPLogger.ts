import {TurboModule, TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  readonly WriteLog:  (lvl:number , text:string) =>void;
  readonly Recreate:  (logFileName:string, lvl:number, maxSize:number) =>void;
  readonly Close:  () =>void;
}

export default TurboModuleRegistry.getEnforcing<Spec>(
  'NativeNPLogger'
);
