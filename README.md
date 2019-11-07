# forge
Build cross-platform apps with HTML, CSS and JavaScript


## Create an app

    mkdir my_app
    cd my_app
    npm init

    npm i @triggercorp/forge --save
    npx forge create


## Build app for Android and run it

    npx forge build android
    npx forge run android


## Build app for iOS and run it

    npx forge build ios
    npx forge run ios


## Global installation

    npm i @triggercorp/forge -g
    forge version

    # Or, if your npm installation requires root permissions for a global install:
    sudo npm i @triggercorp/forge -g --unsafe-perm=true
