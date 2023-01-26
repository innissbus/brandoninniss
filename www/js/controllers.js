"use strict";

angular
  .module("cleansnap.controllers", ["firebase"])
  .controller("MapCtrl", MapCtrl)
  .controller("ReportCtrl", ReportCtrl)
  .controller("AuthingCtrl", AuthingCtrl)
  .controller("TabsCtrl", TabsCtrl)
  .controller("SettingsCtrl", SettingsCtrl);

/////////////////

MapCtrl.$inject = [
  "$scope",
  "Login",
  "Jobs",
  "Location",
  "Defaults",
  "$timeout",
  "$ionicLoading",
  "$ionicPopup",
];
function MapCtrl(
  $scope,
  Login,
  Jobs,
  Location,
  Defaults,
  $timeout,
  $ionicLoading,
  $ionicPopup
) {
  $scope.markers = [];
  $scope.search = { address: "" };

  $scope.settings = Login;
  $scope.searchButtonText = "Finding your location, please wait...";
  var mapObject;

  $ionicLoading.show({
    template: "<ion-spinner></ion-spinner><p>Loading...</p>",
    // noBackdrop: true
  });

  // hide loading after 3 second
  $timeout(function () {
    $scope.searchButtonText = "Search for Jobs";
    $ionicLoading.hide();
  }, 3000);

  // refresh map
  $scope.$on("$ionicView.enter", function (e) {
    if (mapObject) {
      google.maps.event.trigger(map, "resize");
    }
  });

  // run as form loads
  // findLocation();

  function removeMarkers() {
    _.forEach($scope.markers, function (marker) {
      marker.setMap(null);
      marker = null;
    });
    $scope.markers = [];
  }

  function addMarker(lat, lng, color) {
    // if (!["yellow", "green", "blue"].includes(color)) color = "red";

    var marker = new google.maps.Marker({
      map: mapObject,
      animation: google.maps.Animation.DROP,
      position: { lat: lat, lng: lng },
      icon: "/img/" + "blue-pins" + ".png",
    });

    $scope.markers.push(marker);

    return marker;
  }

  function findLocation() {
    if (Location.location) {
      if ($scope.searchButtonText !== "Show Me Jobs") {
        $scope.searchButtonText = "Show Me Jobs";
      }
    } else {
      Location.findLocation()
        .then(function (location) {
          console.log("found location", Location);
          $scope.searchButtonText = "Show Me Jobs";

          // hide loading after 3 second
          $timeout(function () {
            $ionicLoading.hide();
          }, 3000);
        })
        .catch(function () {
          // hide loading after 3 second and display failed
          $timeout(function () {
            $ionicLoading.hide();
            $ionicPopup.alert({
              title: "Failed to find location",
              template: "Couldn't find your location, try again?",
            });
          }, 3000);
          console.log("failed to find location", Location);
          $scope.searchButtonText = "Couldn't find your location, try again?";
        });
    }
  }

  // have to use this callback because we had to stack promises over a geoquery event
  // hopefully can make better with observable later
  var queryDoneCallback = function () {
    if (Jobs.jobsList.length) {
      _.forEach(Jobs.jobsList, function (job) {
        var content = '<ion-content overflow-scroll="true">';
        content += '<div class="row padding">';
        content += '<div class="col-80"><h4>' + job.name + "</h4></div>";
        if (showDirections) {
          content += "<div>";
          content += '<a href="' + Location.getDirectionsUrl(job.lat, job.lon);
          content += '" target="_blank">Directions</a>';
          content += "</div>";
        }
        content += "</div>";
        content += "</div>";
        content += ' <div class="row padding">';
        content += '<div class="col-20">';
        content += "<b>Description:</b>";
        content += "</div>";
        content += '<div class="ionic-selectable ionic-preserve-whitespace">';
        if (job.description) {
          content += job.description;
        } else {
          content += "No Description available";
        }
        content += "</div>";
        content += "</div>";
        content += "</ion-content>";
        var infowindow = new google.maps.InfoWindow({
          content: content,
        });

        if (job.stageName == "Negotiations" || job.stageName=="Cleaning concierge") {
          var marker = addMarker(job.lat, job.lon, "green");
        }
        else {
          var marker = addMarker(job.lat, job.lon, "yellow");
        }

        marker.addListener("click", function () {
          infowindow.open(mapObject, marker);
        });
      });
    } else {
      _.forEach(Jobs.locations, function (location) {
        addMarker(location.lat, location.lon, "yellow");
      });
    }

    // add blue pin in the center of the search area
    // if (Location.location && Location.location.lng && Location.location.lat) {
    //   addMarker(Location.location.lat, Location.location.lng, 'blue');
    // }
    // delay hiding the searching for jobs spinner while the markers render
    // arbitrarily wait 5ms per job
    var loadingSpinnerTimeout = Jobs.locations.length * 5;
    // console.log(Jobs.locations.length, Jobs.jobsList.length, loadingSpinnerTimeout);
    $timeout(function () {
      $ionicLoading.hide();
    }, loadingSpinnerTimeout);
  };

  $scope.searchEvent = function (e) {
    if (e.keyCode === 13) $scope.searchClick();
  };

  $scope.getPins = function(){
    if(localStorage.getItem('restAuthToken')){
      $scope.searchClick();
    };
  }

  $scope.searchClick = function () {
    // if not logged in, pop up the login dialog
    // console.log('checking search place', $scope.search.address);

      if (!_.isEmpty($scope.search.address)) {
        //moved all map navigation logic into promise response
        geocoder.geocode({ address: $scope.search.address }, function (
          results,
          status
        ) {
          // console.log(status);
          if (status == google.maps.GeocoderStatus.OK) {
            var loc = results[0].geometry.location;
            $scope.search.address = results[0].formatted_address;
            Location.location = { lat: loc.lat(), lng: loc.lng() };
            jobSearch();
          } else {
            $ionicPopup.alert({
              title: "No results",
              template: "Sorry, this search produced no results.",
            });
          }
        });
      } else {
        
        Location.findLocation()
          .then(function () {
            jobSearch();
            console.log("In HERE+++++++++");
          })
          .catch(function () {
            $ionicLoading.hide();
            $ionicPopup.alert({
              title: "No results",
              template: "Sorry, this search produced no results.",
            });
          });
      }
  };

  $scope.$watch('$viewContentLoaded', function preloadedMap(){
    Location.findLocation()
          .then(function () {
            if (!mapObject) {
              mapObject = new google.maps.Map(document.getElementById("map"), {});
            }
            prepMap();
          })
 });

  var searchArea; // local variable to hold map circle object
  var showDirections = false;

  //var map = new google.maps.Map(document.getElementById("map"),
  //  {
  //  center: "loc"
  //});

  var geocoder = new google.maps.Geocoder();
  // console.log(geocoder);

  function prepMap() {
    if (Login.paidAccount) {
      mapObject.maxZoom = 22;
      showDirections = true;
    } else {
      // mapObject = new google.maps.Map(document.getElementById("map"), {})
      mapObject.maxZoom = 7;
      showDirections = false;
    }

    // clear off any existing markers
    removeMarkers();

    var searchRadius = Login.profile.searchRadius
      ? Login.profile.searchRadius
      : Defaults.defaultSearchRadius;

    var newSearchArea = new google.maps.Circle({
      strokeColor: "#0000FF",
      strokeOpacity: 0.4,
      strokeWeight: 1,
      fillColor: "#0000FF",
      fillOpacity: 0.05,
      map: mapObject,
      center: Location.location,
      radius: Math.round(searchRadius * 1609.344), // convert from miles to meters
    });

    var bounds = newSearchArea.getBounds();
    mapObject.fitBounds(bounds);

    // console.log(newSearchArea);
    if (searchArea) {
      searchArea.setMap(null);
    }
    searchArea = newSearchArea;
    return searchRadius;
  }

  var jobSearch = function () {

    // reset map zoom level if we're logged in
    if (!mapObject) {
      mapObject = new google.maps.Map(document.getElementById("map"), {});
    }

    $ionicLoading.show({
      template: "<ion-spinner></ion-spinner><p>Searching for jobs...</p>",
      noBackdrop: true
    });

    var searchRadius = prepMap();

    Jobs.searchJobs(Location.location, searchRadius, queryDoneCallback);
  };

  /* var mapOptions = {
    center: Defaults.centerUsa,
    zoom: 2,
    minZoom: 4,
    maxZoom: 10,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    streetViewControl: false,
    mapTypeControl: false,
    zoomControl: true,
    zoomControlOptions: {
      position: google.maps.ControlPosition.RIGHT_TOP
    }
  }; */

  // var mapObject = new google.maps.Map(document.getElementById("map"), mapOptions);

  // google.maps.event.addListenerOnce(mapObject, 'idle', function () {
  // do something only the first time the map is loaded

  // push the "get jobs" button into the map
  //var centerControlDiv = document.getElementById("mapButton");
  //centerControlDiv.index = 1;
  //mapObject.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(centerControlDiv);
  // if (Jobs.jobsLoaded) {
  // console.log('if Jobs.jobsLoaded');
  // prepMap();
  // queryDoneCallback();
  //}
  //else {
  // console.log('else Jobs.jobsLoaded');
  // Jobs.searchJobs(Defaults.centerUsa, Defaults.fullUsaSearchRadius, queryDoneCallback);
  // }
  // });
  //});
}

///////////////

ReportCtrl.$inject = [
  "$scope",
  "Jobs",
  "Location",
  "$ionicModal",
  "$ionicLoading",
];
function ReportCtrl($scope, Jobs, Location, $ionicModal, $ionicLoading) {
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //
  //$scope.$on('$ionicView.enter', function(e) {
  //});

  $scope.getDirectionsUrl = function (lat, lng) {
    return Location.getDirectionsUrl(lat, lng);
  };

  $scope.$on("$ionicView.enter", function (e) {
    //$scope.jobs = null;
    // console.log('ive', Jobs.jobsList.length, $scope.jobs);
    // if (!$scope.jobs && Jobs.jobsList.length) {
    $ionicLoading.show({
      template: "<ion-spinner></ion-spinner><p>Loading...</p>",
      // noBackdrop: true
    });

    if (Jobs.jobsList) {
      $scope.jobs = Jobs.jobsList;
      $scope.$apply();
    } else {
      $scope.jobs = null;
    }
    $ionicLoading.hide();
    // console.log(Jobs.jobsList, $scope.jobs)
  });
  //$scope.remove = function (job) {
  //  Jobs.remove(job);
  //};

  $ionicModal.fromTemplateUrl(
    "templates/job-detail.html",
    function ($ionicModal) {
      $scope.modal = $ionicModal;
    },
    {
      // Use our scope for the scope of the modal to keep it simple
      scope: $scope,
      // The animation we want to use for the modal entrance
      animation: "slide-in-up",
    }
  );

  $scope.$on("$destroy", function () {
    $scope.modal.remove();
  });

  $scope.hideNegoWhen = function () {
    $scope.modal.hide();
  };
  $scope.printWindow = function () {
    var originalContents = document.body.innerHTML;
    var printReport= document.getElementById('page-wrapper').innerHTML;
    document.body.innerHTML = printReport;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  }
  $scope.showNegoWhen = function (jobId) {
    var job = _.find($scope.jobs, { id: jobId });
    $scope.jobName = job.name || "";
    $scope.whenNeeded = job.whenNeeded || "";
    $scope.negotiationApproval = job.negotiationApproval || "";
    $scope.description = job.description || "";
    $scope.primaryContactStatement = job.primaryContactStatement || "";

    $scope.modal.show();
  };

  $scope.formatAddress = function (addr, city, state) {
    var result = addr ? addr : "";

    if (result && city && result.trim().substr(-1) != ",") {
      result += ", ";
    }
    if (result.substr(-1) === ",") {
      result += " ";
    }
    if (city) {
      result += city;
    }

    if (result && state && result.trim().substr(-1) != ",") {
      result += ", ";
    }
    if (result.substr(-1) === ",") {
      result += " ";
    }
    if (state) {
      result += state;
    }

    return result;
  };

  $scope.reportRowClass = function (jobStage, rowEven) {
    return (
      (rowEven ? "row-even-" : "row-odd-") +
      (jobStage === "Negotiations" || jobStage === "Cleaning concierge" ? "green" : "yellow")
    );
  };
}

///////////////

SettingsCtrl.$inject = [
  "$scope",
  "$location",
  "Login",
  "Defaults",
  "$ionicLoading",
  "$http"
];
function SettingsCtrl($scope, $location, Login, Defaults, $ionicLoading, $http) {
  $ionicLoading.show({
    template: "<ion-spinner></ion-spinner><p>Loading...</p>",
    // noBackdrop: true
  });

  $scope.isLoggedIn = function(){
    const tokenPresent = !!localStorage.getItem('restAuthToken')
    return !tokenPresent;
  }
  var loginPromise = Login.login();

  loginPromise.then(function () {
    $scope.profile = Login.profile;
    $scope.paidAccount = Login.paidAccount;
    $scope.isAnonymous = Login.isAnonymous;
    $scope.searchRadius = $scope.profile.searchRadius;
    $scope.maxSearchRadius = Login.maxSearchRadius;
    $ionicLoading.hide();
  });

  $scope.logoutUser = function(){
    $ionicLoading.show({
      template: "<ion-spinner></ion-spinner><p>Loading...</p>",
    });
    localStorage.removeItem(('restData'));
    localStorage.removeItem(('tokenExpiryDate'));
    const req = {
      method: 'POST',
      url: 'https://getcleansnap.com/wp-json/aam/v2/jwt/revoke',
      data: JSON.stringify({jwt: localStorage.getItem("restAuthToken")}),
      headers: {
          "Content-Type": "application/json",
      }
     }
     $http(req)
     window.location.reload(); 
     $ionicLoading.hide(); 
     localStorage.removeItem("restAuthToken")
    // return $http(req).then(i=>{window.location.reload(); $ionicLoading.hide(); localStorage.removeItem("restAuthToken")}).catch(e=>$ionicLoading.hide())
  }

  $scope.saveProfile = function () {
    if (Login.authData.provider !== "anonymous") {
      // console.log('saving profile', $scope.profile);
      $scope.profile.$save();
    }
  };

  $scope.radiusChanged = function (searchRadius) {
    var radius = parseInt(searchRadius);
    // console.log($scope.profile.searchRadius, radius);
    if (!isNaN(radius)) {
      if (radius < Defaults.minSearchRadius || radius > Login.maxSearchRadius) {
        radius = Defaults.defaultSearchRadius;
      }
      $scope.profile.searchRadius = radius;
      // console.log($scope.profile.searchRadius, radius);
      $scope.saveProfile();
    }
  };
}
///////////////

TabsCtrl.$inject = ["$scope", "Login"];
function TabsCtrl($scope, Login) {
  $scope.minAccountLevel = function (accountLevel) {
    if (Login.accountLevel < accountLevel) {
      return "ng-hide";
    } else {
      return "ng-show";
    }
  };
}

///////////////

AuthingCtrl.$inject = [
  "$scope",
  "$state",
  "$ionicHistory",
  "Login",
  "Jobs",
  "Location",
  "$ionicLoading",
  "$ionicPopup",
];
function AuthingCtrl($scope, $state, $ionicHistory, Login, Jobs, Location, $ionicLoading,
  $ionicPopup) {
  $scope.handleSubmit = function(user){
    if(!user?.username || !user?.password){
      $ionicPopup.alert({
        title: "Invalid login credentials",
        template: "Invalid username, email address or incorrect password.",
      });
      return;
    }
    localStorage.removeItem(('restData'));
    Login.login(user ?? {}).then(function () {
      $ionicLoading.show({
        template: "<ion-spinner></ion-spinner><p>Loading...</p>",
      });
      var currentStateName = $state.current.name;
      // console.log(currentStateName);
      var targetStateName = currentStateName.replace("-authing", "");
      // console.log(targetStateName);
      // pull jobs?
      if (targetStateName === "tab.jobdata") {
        // console.log('authing');
        Location.findLocation()
          .then(function (location) {
            // console.log('authing found location', Location);
            Jobs.searchJobs(
              Location.location,
              Login.profile.searchRadius,
              gotoTarget
            );
            // console.log('found jobs', Jobs.jobsList);
            $ionicLoading.hide()
          })
          .catch(function () {
            console.log("failed to find location", Location);
          });
      } else {
        gotoTarget();
      }
  
      function gotoTarget() {
        // console.log('authing goto target');
  
        // remove the authing interestital from history and go to logged in page
        // see https://github.com/driftyco/ionic/issues/1287
        $ionicHistory.currentView($ionicHistory.backView());
        $state.go(targetStateName, {}, { location: "replace" });
      }
  
      // $state.go(targetStateName);
      // $window.history.back();
    });
  }
}
