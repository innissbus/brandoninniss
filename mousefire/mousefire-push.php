<?php

/*
Script Name: Mouse Fire web hook
Description: Updates Firebase user data when called by MemberMouse web hooks
Version: 0.2
Author: Mike Stankavich
Author URL: http://mikestankavich.com

test urls:
http://one.wordpress.test/wp-content/plugins/mousefire/mousefire-push.php?event_type=mm_member_account_update&email=mike%40kwyk.net&expiration_date=&status=1
http://one.wordpress.test/wp-content/plugins/mousefire/mousefire-push.php?event_type=mm_member_account_update&email=muck%40kwyk.net&expiration_date=2017-2-2&status=1&first_name=Mack&last_name=TheKnife&membership_level_name=CleanSnap%20Paid%20Membership

*/

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once(__DIR__ . "/../../../wp-load.php");
require_once(__DIR__ . "/../membermouse/includes/mm-constants.php");
require_once(__DIR__ . "/../membermouse/includes/init.php");

require_once("firebaseLib.php");

// status constant(s)
$ACTIVE = 1;

// ---- EVENT TYPES ----
$MEMBER_ADD = "mm_member_add";
$MEMBER_STATUS_CHANGE = "mm_member_status_change";
$MEMBER_LEVEL_CHANGE = "mm_member_level_change";
$MEMBER_MEMBERSHIP_CHANGE = "mm_member_membership_change";
$MEMBER_ACCOUNT_UPDATE = "mm_member_account_update";
$MEMBER_DELETE = "mm_member_delete";

function get_request_variable($variable_name, $required)
{
    if (isset($_REQUEST[$variable_name])) {
        return $_REQUEST[$variable_name];
    } else if ($required) {
        print "Missing required parameter " . $variable_name;
        exit;
    } else {
        return "";
    }
}

// ---- GET EVENT TYPE ----
$eventType = get_request_variable("event_type", true);

if (!in_array($eventType, [
    "mm_member_add",
    "mm_member_status_change",
    "mm_member_membership_change",
    "mm_member_account_update",
    "mm_member_delete"
])
) {
    print "Event type not handled: " . $eventType;
    exit;
}

$email = get_request_variable("email", true);
$status = get_request_variable("status", true);
$expirationDate = get_request_variable("expiration_date", false);
$firstName = get_request_variable("first_name", false);
$lastName = get_request_variable("last_name", false);
$membershipLevelName = get_request_variable("membership_level_name", false);

$emailKey = str_replace(["%40", "."], ["@", ","], urlencode($email));
$active = ($status == $ACTIVE && $eventType != $MEMBER_DELETE);
//print 'a ' . $active . ' s ' . $status . ' c ' . $ACTIVE . ' t ' . $eventType ;

// should move to array topside
switch ($membershipLevelName) {
    // what about admin?
    case 'CleanSnap Paid Membership':
        $accountLevel = 50;
        $paidAccount = true;
        break;
    default:  // 'Free Membership' or unknown
        $accountLevel = 10;
        $paidAccount = false;
}

$settings = array(
    'cleansnap-local' => array(
        'url' => 'https://cleansnap-local.firebaseio.com',
        'secret' => 'zWSXBKFuiVjheG1ouFtBIcHfSFU5OksqkNiRqXXM'
    ),
    'cleansnap-dev' => array(
        'url' => 'https://cleansnap-dev.firebaseio.com',
        'secret' => 'KFHckSgoQunBOnatgcJYRqbl3NBQmhlu4W0TT7Om'
    ),
    'cleansnap' => array(
        'url' => 'https://cleansnap.firebaseio.com',
        'secret' => 'kHgTofdz4YIltI32VII2jNrTFprwyXl528Xc44dG'
    )
);

foreach ($settings as $config) {
    $firebase = new \Firebase\FirebaseLib($config['url'], $config['secret']);

    $profile = json_decode($firebase->get('tprofiles/' . $emailKey), true);

//    print_r($profile);

    // yes, it returns a string 'null' rather than a "real" null
    if ($profile === 'null' || is_null($profile) || empty($profile)) {
        // set default values here
        $profile = array(
            'notifyEmail' => true,
            'notifyAdded' => true,
            'notifyChanged' => true,
            'notifyRemoved' => true
        );
    }
    $profile['email'] = $email;
    $profile['expirationDate'] = $expirationDate;
    $profile['active'] = $active;
    $profile['firstName'] = $firstName;
    $profile['lastName'] = $lastName;
    $profile['accountLevel'] = $accountLevel;
    $profile['paidAccount'] = $paidAccount;

//    print_r($profile);

    $firebase->set('profiles/' . $emailKey, $profile);

}
