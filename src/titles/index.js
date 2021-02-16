import { PluginIcon } from './components';
import Plugin from './plugin';

const { registerPlugin } = wp.plugins;
const { createElement } = wp.element;
const { dispatch } = wp.data;
const { __ } = wp.i18n;

registerPlugin( 'altis-experiments', {
	title: __( 'Experiments', 'altis-experiments' ),
	icon: createElement( PluginIcon ),
	render: Plugin,
} );

// Open sidebar if we have the experiments hash.
if ( window.location.hash.match( /^#experiments-([a-z]+)/ ) ) {
	dispatch( 'core/edit-post' ).openGeneralSidebar( 'altis-experiments/altis-experiments' );
}
