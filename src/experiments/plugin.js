import React, { Fragment } from 'react';

import TestPanel from './components/panel';
import { getTestsRegistry } from './data/registry';

const {
	PluginSidebar,
	PluginSidebarMoreMenuItem,
} = wp.editPost;
const { __ } = wp.i18n;

/**
 * Block Editor sidebar plugin component for A/B tests.
 *
 * @returns {React.ReactNode} The plugin sidebar.
 */
const Plugin = () => {
	const tests = getTestsRegistry().tests;

	// Short circuit early if no panels are defined, to disable the sidebar completely.
	if ( tests.length < 1 ) {
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
				{ tests && Object.keys( tests ).map( testId => (
					<TestPanel testId={ testId } />
				) ) }
			</PluginSidebar>
		</Fragment>
	);
};

export default Plugin;
