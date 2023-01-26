# cleansnap-mvp

### Set up

- Clone this repository locally.
- Go ahead and CD in to the project directory
- Install Ionic globally `npm i -g ionic`
- Install bower for intalling packages ... This is crucial because it won't run if you don't use bower.
- Run `bower install`. You should see a /Lib folder created in the root directory.
- if you run into node-gyp error bacause of nod-saas, run `npm install sass gulp-sass --save-dev`
- If that was all good, run `ionic serve` to start running the application locally

# Deployment

### To deploy to the product's staging and production using terminal

> There are two Aliases one for cleansnap and cleansnap-dev
> One needs to install firebase-tools globally first by running `npm i -g firebase-tools
- You need to also to have a created Firebase account and loging through the commandline at this point
- Run `firebase login:ci`. You will get redirected to the browser for 0Auth Login.
- If login is successful, you will get a prompt in the terminal showing you `you're logged in as xx@xxx.com`
- Go ahead and check the list of projects you have attached to your account `firebase projects:list`
- Choose the project you want to deploy to at the time which order of cleansnap-dev -> cleansnap production would be best.
- Run `firebase use [ProjectName]
- Run `firebase deploy`
