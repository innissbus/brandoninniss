/**
 * Set configuration variables prior to starting up Angular
 */

if (document.domain == 'app.getcleansnap.com' || document.domain == 'cleansnap.firebaseapp.com') {
  // production
  var CleansnapAppConfig = {
    firebaseUrl: 'https://cleansnap.firebaseio.com/',
    mousefireUrl: 'https://getcleansnap.com/wp-json/mousefire/v1/firebase_token?firebase_database=cleansnap',
    loginUrl: 'https://getcleansnap.com/login/',
    upgradeUrl: 'https://www.getcleansnap.com/pricing-app/',
    firebaseConfig: {
      apiKey: "AIzaSyB190W-KIBd4zH8Ax36mKn6mWYaiZ7cQCg",
      authDomain: "cleansnap.firebaseapp.com",
      databaseURL: "https://cleansnap.firebaseio.com",
      projectId: "project-8261058087937695546",
      storageBucket: "project-8261058087937695546.appspot.com",
      messagingSenderId: "1083971248471",
      appId: "1:1083971248471:web:28be1861e3c40a47"
    }
  };
}
else if (document.domain == 'cleansnap-dev.firebaseapp.com' || document.domain == 'localhost') {
  // dev, test
  var CleansnapAppConfig = {
    firebaseUrl: 'https://cleansnap-dev.firebaseio.com/',
    mousefireUrl: 'https://getcleansnap.com/wp-json/mousefire/v1/firebase_token?firebase_database=cleansnap-dev',
    loginUrl: 'http://localhost:3001/',
    upgradeUrl: 'https://www.getcleansnap.com/pricing-app/',
    firebaseConfig: {
      apiKey: "AIzaSyB2yLSsac61cali2WwJ72M_NIq1UdY4TIo",
      authDomain: "cleansnap-dev.firebaseapp.com",
      databaseURL: "https://cleansnap-dev.firebaseio.com",
      projectId: "firebase-cleansnap-dev",
      storageBucket: "firebase-cleansnap-dev.appspot.com",
      messagingSenderId: "232425499981",
      appId: "1:232425499981:web:551eaf17de0e06a3"
    }
  };
}
else {
  // local
  var CleansnapAppConfig = {
    firebaseUrl: 'https://cleansnap-dev.firebaseio.com/',
    mousefireUrl: 'http://vagrantpress.dev/?mousefireFirebase=cleansnap-dev',
    // loginUrl: 'http://vagrantpress.dev/login/',
    loginUrl: 'https://getcleansnap.com/login/',
    // upgradeUrl: 'http://vagrantpress.dev/sample-page/'
    upgradeUrl: 'https://www.getcleansnap.com/pricing-app/',
    firebaseConfig: {
      apiKey: "AIzaSyB2yLSsac61cali2WwJ72M_NIq1UdY4TIo",
      authDomain: "cleansnap-dev.firebaseapp.com",
      databaseURL: "https://cleansnap-dev.firebaseio.com",
      projectId: "firebase-cleansnap-dev",
      storageBucket: "firebase-cleansnap-dev.appspot.com",
      messagingSenderId: "232425499981",
      appId: "1:232425499981:web:551eaf17de0e06a3"
    }
  };
}

