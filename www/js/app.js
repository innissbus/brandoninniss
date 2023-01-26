// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'cleansnap.services' is found in services.js
// 'cleansnap.controllers' is found in controllers.js

angular.module('cleansnap', ['ionic', 'cleansnap.controllers', 'cleansnap.services', 'firebase'])
  // see config.js which sets global config variable CleansnapAppConfig
  .constant('FirebaseUrl', CleansnapAppConfig.firebaseUrl)
  .constant('MousefireUrl', CleansnapAppConfig.mousefireUrl)
  .constant('LoginUrl', CleansnapAppConfig.loginUrl)
  .constant('UpgradeUrl', CleansnapAppConfig.upgradeUrl)
  // .service('rootRef', ['FirebaseUrl', Firebase])
  .run(ApplicationRun)
  .config(ApplicationConfig);

ApplicationRun.$inject = ['$ionicPlatform', '$rootScope', '$state', '$location', '$window', 'Login', 'LoginUrl', 'UpgradeUrl'];
function ApplicationRun($ionicPlatform, $rootScope, $state, $location, $window, Login, LoginUrl, UpgradeUrl) {
  // wire routing to redirect to login for pages other than map

  function checkAccess(toState, toParams) {
    // var previousLocation = "";

    // if we are going to any page other than the map and we are not logged in
    // show the notice that you need to be logged in
    // console.log('checkAccess', toState, Login.accountLevel);

    // see if current user login does not allow access - if so, handle
    if (toState.accountLevel > Login.accountLevel) {
      // block the navigation
      // event.preventDefault();
      // see if async login to cleansnap has finished
      // console.log('deep link', Login);
      if (Login.isLoggedIn) {
        // if they aren't logged in, send them to cleansnap to log in
        // console.log(toState.name, $state.href(toState.name, toParams, {absolute: true}));

        var returnUrl = encodeURIComponent($state.href(toState.name, toParams, {absolute: true}));
        // console.log(returnUrl);
        // console.log(returnUrl, Login.authData.provider);
        if (Login.isAnonymous) {
          var redirectTo = LoginUrl + '?mousefireRedirect=' + returnUrl;
        }
        // else send them to cleansnap to upgrade their account
        else {
          var redirectTo = UpgradeUrl;
        }
        // console.log(redirectTo);
        $window.open(redirectTo, '_self');
      }
      else {
        // go to interstital while waiting for cleansnap login check to finish
        $state.go(toState.name + '-authing');
      }
    }
  }


  // console.log('starting state',$state.current);
  // console.log('location',$location.url());
//  checkAccess($state.$current, $state.$current.params);

  // how to pass in current state location & params?
  // checkAccess($state.current, $state.params);
  //
  $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
    // console.log('$stateChangeStart', toState);

    // detect page refresh and redirect back to root if not on the map tab
    if (fromState.views === null && toState.name !== 'tab.map') {
      event.preventDefault();
      $state.go('tab.map');
    }

    // force login check to getcleansnap once an hour
    var loginCheckInterval = 1 * 60 * 60 * 1000;

    // console.log(Login.loginDateTime, Date.now() - Login.loginDateTime);
    if (Date.now() - Login.loginDateTime > loginCheckInterval || !Login.loginDateTime) {
      // console.log('push login check');
      Login.login();
    }

    if (toState.accountLevel > Login.accountLevel) {
      // block the navigation
      event.preventDefault();

      checkAccess(toState, toParams);

    }
  });

  $ionicPlatform.ready(function () {
    // console.log('platform ready state',$state.current);

    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);

    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
    console.log('running on ', ionic.Platform.platform());
  });
}

ApplicationConfig.$inject = ['$stateProvider', '$urlRouterProvider', '$httpProvider'];
function ApplicationConfig($stateProvider, $urlRouterProvider, $httpProvider) {

  // enable http auth so that we can call api on wordpress site for JWT token and membership level
  $httpProvider.defaults.withCredentials = true;

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider
  // setup an abstract state for the tabs directive
    .state('tab', {
      url: '/tab',
      abstract: true,
      templateUrl: 'templates/tabs.html',
      controller: 'TabsCtrl'
    })

    // Each tab has its own nav history stack:

    .state('tab.map', {
      url: '/map',
      accountLevel: 0,
      cache: false,
      views: {
        'tab-map': {
          templateUrl: 'templates/tab-map.html',
          controller: 'MapCtrl'
        }
      }
    })
    .state('tab.jobdata', {
      url: '/jobdata',
      accountLevel: 50,
      cache: false,
      views: {
        'tab-jobdata': {
          templateUrl: 'templates/tab-jobdata.html',
          controller: 'ReportCtrl'
        }
      }
    })
    .state('tab.jobdata-authing', {
      url: '/login',
      accountLevel: 0,
      cache: false,
      views: {
        'tab-jobdata': {
          templateUrl: 'templates/authing.html',
          controller: 'AuthingCtrl'
        }
      }
    })
    .state('tab.settings', {
      url: '/settings',
      cache: false,
      accountLevel: 0,
      views: {
        'tab-settings': {
          templateUrl: 'templates/tab-settings.html',
          controller: 'SettingsCtrl'
        }
      }
    })
    .state('authing', {
      url: '/authing',
      // cache: false,
      accountLevel: 0,
      templateUrl: 'templates/authing.html',
      controller: 'AuthingCtrl'
    });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/tab/map');

}
