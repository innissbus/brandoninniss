<?php

/*
Script Name: Mouse Fire member data extract for sync with firebase
Description: Lists membermouse member name, email, status and level
Version: 0.1
Author: Mike Stankavich
Author URL: http://mikestankavich.com

test urls:
http://vagrantpress.dev/wp-content/plugins/mousefire/mousefire-members.php?key=r3l-ziL_gSD

todo: better (not hard coded) security
*/

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once(__DIR__ . "/../../../wp-load.php");
require_once(__DIR__ . "/../membermouse/includes/mm-constants.php");
require_once(__DIR__ . "/../membermouse/includes/mm-functions.php");
require_once(__DIR__ . "/../membermouse/lib/class.membermousestream.php");
require_once(__DIR__ . "/../membermouse/includes/init.php");

// security key (should not be hard coded)
$KEY = "r3l-ziL_gSD";

// status constant(s)
$ACTIVE = 1;

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

// ---- check auth ----
if (get_request_variable("key", true) != $KEY) {
    print "Incorrect auth key.";
    exit;
}

// blows up after move to cloudways, but seems to not be used
// $user_query = new WP_User_Query( array ( 'orderby' => 'email', 'order' => 'ASC' ) );

header('content-type: application/json; charset=utf-8');

//$userHooks = new MM_UserHooks();
//echo json_encode($userHooks->checkEmployeeAccess()) . "\n";
//echo json_encode($current_user) . "\n";
//echo json_encode(MM_user) . "\n";


$sql = "SELECT u.user_email AS email, u.user_nicename AS firstName, '' AS lastName, 1 AS active, 1 AS paidAccount, 100 AS accountLevel ";
$sql .= "FROM ".$wpdb->users." u ";
$sql .= "JOIN ".$wpdb->usermeta." um ON um.user_id = u.id AND um.meta_key = 'wp_user_level' and um.meta_value = '10' ";
$sql .= "UNION ALL ";
$sql .= "SELECT u.user_email AS email, mu.first_name AS firstName, mu.last_name AS lastName, (mu.status = ".MM_Status::$ACTIVE.") AS active, (l.is_free = 0) AS paidAccount, CASE WHEN l.is_free THEN 10 ELSE 50 END AS accountLevel ";
$sql .= "FROM ".$wpdb->users." u ";
$sql .= "JOIN ".MM_TABLE_USER_DATA." mu ON mu.wp_user_id = u.id ";
$sql .= "JOIN ".MM_TABLE_MEMBERSHIP_LEVELS." l ON l.id = mu.membership_level_id ";
$sql .= "ORDER BY email";

// echo json_encode($sql) . "\n";

$results = $wpdb->get_results($sql);
echo json_encode($results) . "\n";

exit;

?>
