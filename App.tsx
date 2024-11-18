import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  Button,
} from 'react-native';

//import NPSyncSpec from './NPSyncHelper'
import Spec from './specs/NativeNPSync'
//import {Spec} from './NPSyncHelper'
//import {myText} from './NPSyncHelper'

const EMPTY = '<empty>';

function App(): React.JSX.Element {
  const [value, setValue] = React.useState<string | null>(null);

  const [editingValue, setEditingValue] = React.useState< string | null >(null);

  React.useEffect(() => {
    //const storedValue = NativeLocalStorage?.getItem('myKey');
    //setValue(storedValue ?? '');
  }, []);

  // function saveValue() {
  //   NativeLocalStorage?.setItem(editingValue ?? EMPTY, 'myKey');
  //   setValue(editingValue);
  // }

  // function clearAll() {
  //   NativeLocalStorage?.clear();
  //   setValue('');
  // }

  // function deleteValue() {
  //   NativeLocalStorage?.removeItem(editingValue ?? EMPTY);
  //   setValue('');
  // }
  function reverseValue() {
    //let x=myText();
    let r = Spec.reverseString(editingValue??EMPTY)
    setValue(r);
  }

  function callBackTest() {
    Spec.echoFromCpp(editingValue??EMPTY, (text:string)=>{ setValue(text) } );
 
  }

  async  function testPromise() {
    //Spec.echoFromCpp(editingValue??EMPTY, (text:string)=>{ setValue(text) } );
    let text = await Spec.callPromise("ha ha");
    setValue(text);  
  }
return (
    <SafeAreaView style={{flex: 1}}>
      <Text style={styles.text}>
        Current stored value is: {value ?? 'No Value'}
      </Text>
      <TextInput
        placeholder="Enter the text you want to store"
        style={styles.textInput}
        onChangeText={setEditingValue}
      />
      <Button title="reverse" onPress={reverseValue} />
      <Button title="callback" onPress={callBackTest} />
      <Button title="promise" onPress={testPromise} />
      {/* <Button title="Clear" onPress={clearAll} /> */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  text: {
    margin: 10,
    fontSize: 20,
  },
  textInput: {
    margin: 10,
    height: 40,
    borderColor: 'black',
    borderWidth: 1,
    paddingLeft: 5,
    paddingRight: 5,
    borderRadius: 5,
  },
});

export default App;