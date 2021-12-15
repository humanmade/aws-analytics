import React, { Fragment } from 'react';

const {
	PluginSidebar,
	PluginSidebarMoreMenuItem,
} = wp.editPost;
const { __ } = wp.i18n;
const { applyFilters } = wp.hooks;

/**
 * Block Editor sidebar plugin component for A/B tests.
 *
 * @param {React.ComponentProps} props The sidebar plugin component props.
 * @returns {React.ReactNode} The plugin sidebar.
 */
const Plugin = () => {
	// Allow adding custom panels.
	const experimentsPanels = applyFilters( 'altis.experiments.panels', [] );

	// Short circuit early if no panels are defined, to disable the sidebar completely.
	if ( experimentsPanels.length < 1 ) {
		return ( <></> );
	}

	return (
		<Fragment>
			<PluginSidebarMoreMenuItem
				target="altis-experiments"
			>
				{ __( 'Experiments', 'altis-analytics' ) }
			</PluginSidebarMoreMenuItem>
			<PluginSidebar
				name="altis-experiments"
				title={ __( 'Experiments', 'altis-analytics' ) }
			>
				{ experimentsPanels && experimentsPanels.map( Panel => <Panel /> ) }
			</PluginSidebar>
		</Fragment>
	);
};

export default Plugin;
