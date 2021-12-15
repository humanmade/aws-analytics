import React, { Fragment } from 'react';

import TestPanel from './components/panel';

const {
	PluginSidebar,
	PluginSidebarMoreMenuItem,
} = wp.editPost;
const { __ } = wp.i18n;
const { applyFilters } = wp.hooks;

/**
 * Block Editor sidebar plugin component for A/B tests.
 *
 * @returns {React.ReactNode} The plugin sidebar.
 */
const Plugin = () => {
	// Allow adding custom panels.
	const experiments = applyFilters( 'altis.experiments.experiments', [] );

	// Short circuit early if no panels are defined, to disable the sidebar completely.
	if ( experiments.length < 1 ) {
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
				{ experiments && experiments.map( experiment => (
					<TestPanel experiment={ experiment } />
				) ) }
			</PluginSidebar>
		</Fragment>
	);
};

export default Plugin;
