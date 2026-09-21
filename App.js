import './src/utils/patchGL';
import * as React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, SafeAreaView, ImageBackground } from 'react-native';
import Moon from './src/Components/moon';
import SunEclipse from './src/Components/sun-eclipse';

export default function App() {
  const [isSunEclipse, setIsSunEclipse] = React.useState(false);
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground
        source={require('./assets/stars.jpeg')}
        resizeMode="cover"
        style={styles.stars}
      >
        {isSunEclipse ? <SunEclipse /> : <Moon />}
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#000000',
  },
  stars: {
    flex: 1,
    width: '100%',
  },
});
