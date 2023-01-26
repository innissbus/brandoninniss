'use strict'

angular
  .module('cleansnap.services', ['firebase'])

  .factory('rootRef', rootRef)
  .factory('Defaults', Defaults)
  .factory('Location', Location)
  .factory('Jobs', Jobs)
  .factory('Login', Login)

rootRef.$inject = ['firebase']
function rootRef(firebase) {
  // Initialize Firebase
  firebase.initializeApp(CleansnapAppConfig.firebaseConfig)

  // firebase.initializeApp(config);

  return firebase.database().ref()
}

Defaults.$inject = []
function Defaults() {
  return {
    centerUsa: { lat: 39.83, lng: -98.58 },
    fullUsaSearchRadius: 2000,
    defaultSearchRadius: 100,
    minSearchRadius: 10,
    adminMaxSearchRadius: 5000,
    userMaxSearchRadius: 500,
    defaultAccountLevel: 0,
  }
}

Location.$inject = ['$q', 'Login', '$ionicPopup']
function Location($q, Login, $ionicPopup) {
  var svc = {
    location: null,
    findLocation: function () {
      return $q(function (resolve, reject) {
        var options = {
          maximumAge: 0,
          timeout: Infinity,
          enableHighAccuracy: true,
        }
        var keyWestLatitude = 24.5
        var phillyLocation = { lat: 40, lng: -75 }
        var lastLocation = {}
        navigator.geolocation.getCurrentPosition(
          function (position) {
            if (position.coords.latitude > keyWestLatitude) {
              svc.location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              }
              Login.setSearchLocation(
                position.coords.latitude,
                position.coords.longitude,
              )
            } else {
              console.log(
                'Latitude is south of Key West, setting location to Philadelpha PA',
              )
              svc.location = phillyLocation
            }
            resolve(svc.location)
          },
          function (err) {
            // alert("Please grant this app permission to be able to access your location.")
            $ionicPopup.alert({
              title: 'Location Required',
              template:
                'Please grant this app permission to be able to access your location for the app to work as expected.',
            })
            console.log('error getting location:', err)

            // if geolocation failed set last known location or set the default Philadelphia
            if (_.isEmpty(Login.profile) && _.isEmpty(Login.profile.lat)) {
              lastLocation = phillyLocation
            } else {
              lastLocation = { lat: Login.profile.lat, lng: Login.profile.lon }
            }
            Login.setSearchLocation(lastLocation.lat, lastLocation.lng)
            svc.location = lastLocation
            resolve(svc.location)
          },
          options,
        )
      })
    },
  }

  svc.getDirectionsUrl = function (lat, lng) {
    if (svc.location.lat && svc.location.lng) {
      var url = 'https://maps.google.com/'

      if (ionic.Platform.isIOS()) {
        url = 'https://maps.apple.com/'
      }

      url += '?saddr=' + svc.location.lat + ',' + svc.location.lng
      url += '&daddr=' + lat + ',' + lng

      return url
    }
  }

  return svc
}

Login.$inject = [
  '$ionicModal',
  '$window',
  '$timeout',
  'rootRef',
  '$http',
  '$firebaseAuth',
  '$firebaseObject',
  'Defaults',
  'MousefireUrl',
  '$ionicLoading',
  '$ionicPopup',
  '$location',
  '$state'
  
]
function Login(
  $ionicModal,
  $window,
  $timeout,
  rootRef,
  $http,
  $firebaseAuth,
  $firebaseObject,
  Defaults,
  MousefireUrl,
  $ionicLoading,
  $ionicPopup,
  $location,
  $state
) {
  // var AccountLevels = {
  //   'Admin': 100,
  //   'CleanSnap Paid Membership': 50,
  //   'Free Membership': 10,
  //   'Not Logged In': 0
  // };

  var svc = {
    authData: null,
    loginEmail: null,
    accountLevel: 0,
    isLoggedIn: false,
    isAnonymous: false,
    active: false,
    maxSearchRadius: Defaults.userMaxSearchRadius,
    expirationDate: new Date().toISOString().split('.')[0] + 'Z',
    firstName: '',
    lastName: '',
    profile: {},
  }

  // authObject.$signInAnonymously()
  //   .then(onFirebaseAuth);
  var AccountLevels = {
    Admin: 100,
    'CleanSnap Paid Membership': 50,
    'Free Membership': 10,
    'Not Logged In': 0,
  }

  function mapAccountLevel(mousefireData) {
    // console.log('mapAccountLevel');

    var accountLevel = Defaults.defaultAccountLevel
    if (mousefireData.admin) {
      accountLevel = AccountLevels['Admin']
    } else if (AccountLevels[mousefireData.membershipName]) {
      if (mousefireData.statusName === 'Active') {
        accountLevel = AccountLevels[mousefireData.membershipName]
      } else {
        // revert cancelled, expired, or inactive account to free member
        accountLevel = AccountLevels['Free Membership']
      }
    }
    // console.log(mousefireData.statusName, accountLevel);
    return accountLevel
  }

  async function onMousefireResponse(response) {
    var wpAuthInfo = response && response?.data
    var token = null

    // console.log('mousefire returned', response)

    var authObject = $firebaseAuth()
    var authPromise
    if(!wpAuthInfo){
      wpAuthInfo = { status: 'NotLoggedIn'}
    }
    switch (wpAuthInfo.status) {
      case 'Success':
        svc.accountLevel = mapAccountLevel(wpAuthInfo)
        svc.paidAccount = svc.accountLevel > AccountLevels['Free Membership']
        svc.loginEmail = wpAuthInfo.email
        if (Date.parse(wpAuthInfo.expirationDate)) {
          svc.expirationDate =
            new Date(wpAuthInfo.expirationDate).toISOString().split('.')[0] +
            'Z'
        }
        if (wpAuthInfo.admin) {
          var expirationDate = new Date()
          expirationDate.setDate(expirationDate.getDate() + 30)
          svc.expirationDate = expirationDate.toISOString().split('.')[0] + 'Z'
        }
        svc.firstName = wpAuthInfo.firstName
        svc.lastName = wpAuthInfo.lastName
        svc.active = wpAuthInfo.statusName === 'Active'
        // console.log(wpAuthInfo.token)

        if (wpAuthInfo.token) {
          svc.isAnonymous = false
          authPromise = authObject.$signInWithCustomToken(wpAuthInfo.token)
        } else {
          svc.isAnonymous = true
          authPromise = authObject.$signInAnonymously()
          // throw "mousefire did not return a JWT token";
        }
        break

      case 'NotLoggedIn':
        // console.log('set $signInAnonymously promise');
        svc.isAnonymous = true
        authPromise = authObject.$signInAnonymously()
        break

      default:
        throw 'Error: mousefire returned ' + wpAuthInfo.status
        break
    }

    // console.log('return authPromise', authPromise);
    return authPromise
  }

  async function onFirebaseAuth(authData) {
    svc.authData = authData
    svc.isLoggedIn = true
    svc.loginDateTime = Date.now()
    if (svc.accountLevel === AccountLevels['Admin']) {
      svc.maxSearchRadius = Defaults.adminMaxSearchRadius
    } else {
      svc.maxSearchRadius = Defaults.userMaxSearchRadius
    }
    var profile = {
      email: svc.loginEmail,
      accountLevel: svc.accountLevel,
      loginChecked: Date.now(),
      paidAccount: svc.paidAccount,
      active: svc.active,
      lastLogin: new Date().toISOString().split('.')[0] + 'Z',
    }
    if (svc.isAnonymous) {
      loginState = 'Done'
      svc.profile = profile
      svc.profile.searchRadius = Defaults.defaultSearchRadius
      return Promise.resolve()
    } else {
      svc.profile = $firebaseObject(
        rootRef.child('profiles').child(authData.uid),
      )
      return svc.profile
        .$loaded()
        .then(function () {
          loginState = 'Done'
          svc.profile = _.assign(svc.profile, profile)
          if (
            !svc.profile.searchRadius ||
            svc.profile.searchRadius > svc.maxSearchRadius
          ) {
            svc.profile.searchRadius = Defaults.defaultSearchRadius
          }
          svc.profile.notifyEmail =
            svc.profile.notifyEmail || _.isNil(svc.profile.notifyEmail)
          svc.profile.notifyAdded =
            svc.profile.notifyAdded || _.isNil(svc.profile.notifyAdded)
          svc.profile.notifyChanged =
            svc.profile.notifyChanged || _.isNil(svc.profile.notifyChanged)
          svc.profile.notifyRemoved =
            svc.profile.notifyRemoved || _.isNil(svc.profile.notifyRemoved)
          svc.profile.expirationDate = svc.expirationDate
          svc.profile.firstName = svc.firstName
          svc.profile.lastName = svc.lastName
          $ionicLoading.hide()
          return svc.profile.$save()

          // should be the end of the chain so just return
        })
        .catch(function (e) {
          $ionicLoading.hide()
          // console.log('onFirebaseAuth error: ', e)
        })
    }
  }

  var loginPromise
  var loginState = 'NotStarted'

  svc.login = async function (loginData) {
    $ionicLoading.show({
      template: '<ion-spinner></ion-spinner><p>Loading...</p>',
    })
    loginState = 'Pending'
    async function getFirebaseTokenResponse(token) {
      const headers = {
          'Content-Type': 'application/json',
          "X-WP-Nonce":  token?.nonce
        }
      
      try{
        const res = await axios(`/wp-json/mousefire/v1/firebase_token?firebase_database=cleansnap`,
                        {headers})
        return res;
      }catch(e){
        return;
        // if (e?.response.status === (401 || 403) && $state.current.name === 'tab.jobdata-authing') $window.location.href = '/login?redirect_to=https://getcleansnap.com/csapp';
      }
    }

    async function getWpNonce(){
      try{
        const res = await axios("https://getcleansnap.com/wp-content/plugins/mousefire/nonce.php", {headers: {'Content-Type': 'application/json'}})
        return res.data;
      }catch(e){
        return
      }
    }

    function isJSON(str) {
      try {
          return (JSON.parse(str));
      } catch (e) {
          return false;
      }
  }
  const nonceObj = await getWpNonce();
  const firebaseToken = await getFirebaseTokenResponse(nonceObj)
  const mousefireResponse = await onMousefireResponse(firebaseToken)
  loginPromise = onFirebaseAuth(mousefireResponse)
  return loginPromise
  }

  loginPromise = svc.login()

  svc.setSearchLocation = function (lat, lon) {
    if (lat == 40 && lon == -75) {
      // fake location for outside of US, i.e. Brandon & Jason, don't save
      return
    }
    // send off a fire-n-forget update to save the search location to profile
    svc.profile.lat = lat
    svc.profile.lon = lon
    if (svc.isLoggedIn && !svc.isAnonymous) {
      svc.profile.$save()
    }
  }

  return svc
}

Jobs.$inject = [
  'rootRef',
  '$firebaseObject',
  '$q',
  'Location',
  'Login',
  '$ionicPopup',
]
function Jobs(rootRef, $firebaseObject, $q, Location, Login, $ionicPopup) {
  var svc = {}

  svc.jobsList = []
  svc.promises = []
  svc.locations = []
  svc.jobsLoaded = false

  var fbJobs = rootRef.child('jobs')
  var fbGeos = rootRef.child('geos')
  var geoFire = new GeoFire(fbGeos)

  //svc.searchJobs = function (latLng, searchRadius, queryDoneCallback) {
  svc.searchJobs = function (latLng, searchRadius, queryDoneCallback) {
    svc.promises = []
    svc.jobsList = []
    svc.locations = []
    svc.jobsLoaded = false

    // Create a GeoQuery centered at specified lat/long with radius in km
    var geoQuery = geoFire.query({
      center: [latLng.lat, latLng.lng],
      radius: Math.round(searchRadius * 1.609344),
    })

    if (searchRadius <= Login.maxSearchRadius) {
      // send off a fire-n-forget update to save the search location for notification
      Login.setSearchLocation(latLng.lat, latLng.lng)
    }

    var geoQueryOnKeyEntered = geoQuery.on('key_entered', function (
      key,
      location,
    ) {
      // query job data for location from firebase
      svc.locations.push({ lat: location[0], lon: location[1] })

      if (searchRadius <= Login.maxSearchRadius) {
        var qry = $firebaseObject(fbJobs.child(key))
        svc.promises.push(qry.$loaded())
      }
    })

    var geoQueryOnReady = geoQuery.on('ready', function () {
      return $q(function (resolve, reject) {
        if (searchRadius <= Login.maxSearchRadius) {
          $q.all(svc.promises).then(function (queryData) {
            svc.jobsList = queryData
            // console.log(svc.jobsList.length);
            setTimeout(function () {
              if (svc.jobsList.length === 0) {
                $ionicPopup.alert({
                  title: 'No Jobs Found',
                  template:
                    'No active jobs found in your area. Increase search distance in Settings to see more jobs.',
                })
              }
            }, 1200)
            svc.jobsLoaded = true
            return queryDoneCallback()
          })
        } else {
          return queryDoneCallback()
        }
      })
    })
  }

  svc.getDirectionsUrl = function (job) {
    if (job.lat && job.lon && Location.location.lat && Location.location.lon) {
      var url = 'https://maps.google.com/'

      if (ionic.Platform.isIOS()) {
        url = 'https://maps.apple.com/'
      }

      url += '?saddr=' + Location.location.lat + ',' + Location.location.lng
      url += '&daddr=' + job.lat + ',' + job.lon

      return url
    }
  }

  return svc
}
