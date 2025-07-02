This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started


> **Nota**: Asegúrate de haber completado las instrucciones de [Configuración del entorno en React Native](https://reactnative.dev/docs/environment-setup) hasta el paso de "Crear una nueva aplicación" antes de continuar.

## Paso 1: Iniciar el servidor Metro

Primero, necesitas iniciar **Metro**, el _bundler_ de JavaScript que viene _incluido_ con React Native.

Para iniciar Metro, ejecuta el siguiente comando desde la _raíz_ de tu proyecto React Native:

```bash
# usando npm
npm start

# O usando Yarn
yarn start

## Paso 2: Iniciar tu aplicación

Deja que Metro Bundler se ejecute en su propia terminal. Abre una nueva terminal desde la raíz de tu proyecto React Native. Ejecuta el siguiente comando para iniciar tu aplicación en Android o iO

### Para Android

```bash
# usando npm
npm run android

# O usando Yarn
yarn android
```

### Para iOS

```bash
# usando npm
npm run ios

# O usando Yarn
yarn ios
```

Si todo está configurado correctamente, deberías ver tu nueva aplicación ejecutándose en tu emulador de Android o simulador de iOS en poco tiempo, siempre que hayas configurado bien el emulador/simulador.

Esta es una forma de ejecutar tu app — también puedes hacerlo directamente desde Android Studio o Xcode, respectivamente.

## Paso 3: Ya puedes modificar la apliación

Ahora que has ejecutado la aplicación con éxito, vamos a modificarla.

1. Abre TesisAlarma.tsx que es la ruta principal de la aplicación
2. Todas las carpetas que se manejan para el desarrollo de la aplicación estan en SRC 
3. Las pantallas se encuentran en presentation y se encuentran dividas por carpetas

## Paso 4. Debemos configurar las variables de entorno del archivo .env.template
1. Se debe seguir la plantilla y llenar los datos de nuestro Firebase Realtime Database
2. El archivo nuevo debe ser nombrado .env

## Paso 5. Debemos realizar configuraciones adicionales para nuestro proyecto
1. En la ruta de andriod\app -> se debe el google-services.json ---> que lo obtenemos de firebase al crear una app android en la consola de firebase
2. Si el nombre que colocamos es diferente al proyecto debemos modificar en el build.gradle que esta en la ruta andriod\app de la siguiete manera 

```bash
    namespace "com.tesisalarma"
    defaultConfig {
        applicationId "Alarma.Xibernetiq" // Aquí se coloca el nombre que le hayamos dado
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0"
    }
```
## Paso 6 . Para lograr enviar peticiones HTTP debemos crear un nuevo archivo en android\app\src\main\res
1. Se debe ir a android\app\src\main\res
2. Se crea una nueva carpeta llamada xml
3. Y crear un nuevo archivo llamado --> network_security_config.xml
4. Colocamos de la siguiente manera
```bash
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">192.168.4.1</domain>
    </domain-config>
</network-security-config>

```
5. Ingresamos a android\app\src\main\AndroidManifest.xml y modificamos de la siguiente manera: 

```bash
    <application
      android:name=".MainApplication"
      android:label="@string/app_name"
      android:icon="@mipmap/ic_launcher"
      android:roundIcon="@mipmap/ic_launcher"
      android:allowBackup="false"
      android:theme="@style/AppTheme"
      android:supportsRtl="true"
      android:networkSecurityConfig="@xml/network_security_config">
    <receiver 
```

## Paso 5. Para generar el bundle de la aplicacion debemos seguir los pasos de la documentacion
- [Publishing to Google Play Store](https://reactnative.dev/docs/signed-apk-android) - Generar el bundle de la aplicacion

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [Introduction to React Native](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you can't get this to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
