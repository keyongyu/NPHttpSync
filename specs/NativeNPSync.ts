import {TurboModule, TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  readonly reverseString: (input: string) => string;
  //readonly reverseStringFromJava: (input: string) => string;
  readonly echoFromCpp:  (id:string, cb:(text:string)=>void ) => void;
  readonly callPromise:  (id:string) => Promise<string> ;
}

export default TurboModuleRegistry.getEnforcing<Spec>(
  'NativeNPSync',
);
