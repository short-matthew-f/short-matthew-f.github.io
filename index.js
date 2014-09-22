$(function () {
  $( 'li.tab' ).click( function( event ) {
    var $tab = $( this );
    var $body = $( $tab.data( 'tab' ) );

    $tab.addClass( 'active' );
    $tab.siblings().removeClass( 'active' );

    $body.addClass( 'active' );
    $body.siblings().removeClass( 'active' );
  });
});