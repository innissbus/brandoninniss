<?php

require __DIR__ . '/vendor/autoload.php';
//use Firebase\Auth\Token\Generator;
use Kreait\Firebase\Factory;
use Kreait\Firebase\ServiceAccount;

require_once( ABSPATH . "wp-load.php" );
require_once( __DIR__ . "/../membermouse/includes/mm-constants.php" );
require_once( __DIR__ . "/../membermouse/includes/init.php" );

/*
Plugin Name: Mouse Fire API Endpoint
Description: Returns firebase token from WP user and MemberMouse membership name
Version: 0.2
Author: Mike Stankavich
Author URL: http://mikestankavich.com
*/

class MouseFire_API_Endpoint {

	/** Hook WordPress
	 * @return void
	 */
	public function __construct() {
		add_filter( 'query_vars', array( $this, 'add_query_vars' ), 0 );

		add_filter( 'mm_login_redirect', array( $this, 'login_redirector' ), 0 );

		add_action( 'parse_request', array( $this, 'sniff_requests' ), 0 );

		// add a lil override for membermouse login failed hooks
		add_filter( 'wp_login_failed', array( $this, 'loginFailed' ), 10001 );
		add_filter( 'authenticate', array( $this, 'authenticateLogin' ), 10001 );

		add_shortcode( 'mousefire_redirect', array( $this, 'mousefire_redirect' ), 0 );
	}

	protected function overrideMMLoginRedirect() {
		/** Tweak MemberMouse login hook magic to properly redirect back to calling login page
		 *

		 */
		if ( class_exists( "MM_CorePageEngine" ) ) {
			if ( defined( "DOING_AJAX" ) && DOING_AJAX ) {
				parse_str( parse_url( $_REQUEST['referer'], PHP_URL_QUERY ) );
				// if query string for login has a mousefireRedirect specified, send us there
				if ( isset( $mousefireRedirect ) ) {
					MM_Session::value( 'redirect_to', $_REQUEST['referer'] );

					return true;
				}
			}
		}
	}

	public function loginFailed( $username ) {
		return $this->overrideMMLoginRedirect();
	}

	public function authenticateLogin( $user ) {
		if ( ( isset( $_POST['log'] ) && $_POST['log'] == '' ) || ( isset( $_POST['pwd'] ) && $_POST['pwd'] == '' ) ) {
			$this->overrideMMLoginRedirect();
		}

		return $user;
	}

	public function login_redirector() {
		// parse query string from referer into local variables
		parse_str( parse_url( $_REQUEST['referer'], PHP_URL_QUERY ) );
		// if query string for login has a mousefireRedirect specified, send us there
		if ( isset( $mousefireRedirect ) ) {
			return $mousefireRedirect;
		}
		// if query string for login has a redirect_to specified, send us there
		if ( isset( $redirect_to ) ) {
			return $redirect_to;
		}

		// else just let membermouse do its thing
		return '';
	}

	// for now hard code options for the plugin here
	// this should be moved into options with a settings page
	protected function plugin_settings() {

		$settings = array();

		$settings['cleansnap-dev'] = array(
			'name'   => 'cleansnap-dev',
			'url'    => 'https://cleansnap-dev.firebaseio.com',
			'secret' => 'KFHckSgoQunBOnatgcJYRqbl3NBQmhlu4W0TT7Om',
			'serviceAccountJson'   => 'firebase-cleansnap-dev.json'
		);

		$settings['cleansnap'] = array(
			'name'   => 'cleansnap',
			'url'    => 'https://cleansnap.firebaseio.com',
			'secret' => 'kHgTofdz4YIltI32VII2jNrTFprwyXl528Xc44dG',
			'serviceAccountJson'   => 'firebase-cleansnap.json'
		);

		return $settings;
	}

	/** Add public query vars
	 *
	 * @param array $vars List of current public query vars
	 *
	 * @return array $vars
	 */
	public function add_query_vars( $vars ) {
		$vars[] = 'mousefireFirebase';
		$vars[] = '$mousefireRedirect';

		return $vars;
	}

	/**    Sniff Requests
	 *    This is where we hijack all API requests
	 *    If $_GET[mousefireFirebase'] is set, we kill WP and serve up Mouse Fire awesomeness
	 * @return die if API request
	 */
	public function sniff_requests() {
		global $wp;

		if ( isset( $wp->query_vars['mousefireFirebase'] ) ) {
			$this->handle_request( $wp->query_vars['mousefireFirebase'] );
			exit;
		}
	}

	/**    mousefire redirect shortcode function
	 *    This is where we hijack all API requests
	 *    If $_GET['mousefireRedirect'] is set we will return it back for use in pages
	 * @return die if API request
	 */
	public function mousefire_redirect( $atts, $content = "" ) {

		if ( isset( $_GET['mousefireRedirect'] ) ) {
			$redirect = $_GET['mousefireRedirect'];

			return "<a href=\"$redirect\">$content</a>";
		} else {
			return "$content";
		}
	}

	/** Handle Requests
	 *    Build up the response and send it on its way
	 * @return void
	 */
	protected function handle_request( $firebaseName ) {

		// Add JWT library
		if ( ! class_exists( 'JWT' ) ) {
			require_once 'JWT.php';
		}
		if ( ! class_exists( 'Services_FirebaseTokenGenerator' ) ) {
			require_once 'FirebaseToken.php';
		}

		$response = array();

		// this needs to move into options instead of hardcoded function
		$options = $this->plugin_settings();

		if ( isset( $options[ $firebaseName ] ) ) {
			$option = $options[ $firebaseName ];
		} else {
			$response['error']  = "No settings for firebase " . $firebaseName;
			$response['status'] = "FatalError";
		}

		if ( is_user_logged_in() ) {
			$user = wp_get_current_user();
		} else {
			$response['error']  = "User not logged in to Cleansnap";
			$response['status'] = "NotLoggedIn";
		}

		if ( isset( $option ) && isset( $user ) ) {
			$response['user']  = $user->user_login;
			$response['email'] = $user->user_email;
			$response['url']   = $option['url'];
			$response['admin'] = current_user_can( 'manage_options' );
			if ( function_exists( 'mm_member_data' ) ) {
				$response['membershipName'] = mm_member_data( array( "name" => 'membershipName' ) );
				$response['statusName']     = mm_member_data( array( "name" => 'statusName' ) );
				$response['expirationDate'] = mm_member_data( array( "name" => 'expirationDate' ) );
				$response['firstName']      = mm_member_data( array( "name" => 'firstName' ) );
				$response['lastName']       = mm_member_data( array( "name" => 'lastName' ) );
			} else {
				$response['membershipName'] = 'Unknown';
				$response['statusName']     = 'Unknown';
				$response['firstName']      = 'Unknown';
				$response['lastName']       = 'Unknown';
				$response['expirationDate'] = new DateTime( '1970-01-01' );
			}

			$serviceAccountJson = __DIR__.'/'.$option['serviceAccountJson'];
			$serviceAccount = ServiceAccount::fromJsonFile($serviceAccountJson);

			$firebase = (new Factory)
				->withServiceAccount($serviceAccount)
				->create();

			$uid = str_replace( [ "%40", "." ], [ "@", "," ], urlencode( $user->user_email ) );
			$additionalClaims = [
				'admin' => current_user_can( 'manage_options' )
			];
			$customToken = $firebase->getAuth()->createCustomToken($uid, $additionalClaims);
			$response['token'] = (string) $customToken;


			$response['status'] = "Success";
		}


		if ( isset( $_SERVER['HTTP_REFERER'] ) ) {
			$url_components = parse_url( $_SERVER['HTTP_REFERER'] );
		} else if ( isset( $_SERVER['HTTP_ORIGIN'] ) ) {
			$url_components = parse_url( $_SERVER['HTTP_ORIGIN'] );
		}

		$cors_hosts = array(
			'http://localhost:8100',
            'http://one.wordpress.test',
            'https://cleansnapdev.local',
			'http://cleansnap-dev.firebaseapp.com',
			'https://cleansnap-dev.firebaseapp.com',
			'http://cleansnap.firebaseapp.com',
			'https://cleansnap.firebaseapp.com',
			'http://app.getcleansnap.com',
			'https://app.getcleansnap.com'
		);

		if ( isset( $url_components['scheme'] ) ) {
			$cors_host = $url_components['scheme'] . '://' . $url_components['host'];
			if ( isset( $url_components['port'] ) ) {
				$cors_host = $cors_host . ':' . $url_components['port'];
			}

			if ( in_array( $cors_host, $cors_hosts ) ) {
				header( 'Access-Control-Allow-Origin: ' . $cors_host );
				header( "Access-Control-Allow-Credentials: true" );
			}
		}

//		$response['cors'] = $cors_host;
//		$response['referer'] = $_SERVER['HTTP_REFERER'];

		header( 'content-type: application/json; charset=utf-8' );
		echo json_encode( $response ) . "\n";
		exit;
	}

}

new MouseFire_API_Endpoint();