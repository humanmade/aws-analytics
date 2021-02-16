import React, { Fragment } from 'react';
import { Panel } from './components';
import { DEFAULT_TEST } from './data/shapes';
import withTestData from './data/with-test-data';
import Results from './results';
import Settings from './settings';

const {
	PluginSidebar,
	PluginSidebarMoreMenuItem,
} = wp.editPost;
const { __ } = wp.i18n;
const { PanelBody } = wp.components;

const Plugin = props => {
	const {
		post,
		test,
	} = props;
	const {
		started,
		paused,
		results,
		end_time: endTime,
	} = test;
	const { winner = false } = results;

	const classNames = [
		started && 'is-started',
		paused && 'is-paused',
	].filter( Boolean ).join( ' ' );

	const hasEnded = endTime < Date.now();

	// Opt the editing user out of the test.
	// This effectively resets their variant after previewing.
	const tests = JSON.parse( window.localStorage.getItem( '_altis_ab_tests' ) || '{}' );
	tests[ `titles_${ post.id }` ] = false;
	window.localStorage.setItem( '_altis_ab_tests', JSON.stringify( tests ) );

	return (
		<Fragment>
			<PluginSidebarMoreMenuItem
				target="altis-experiments"
			>
				{ __( 'Experiments', 'altis-experiments' ) }
			</PluginSidebarMoreMenuItem>
			<PluginSidebar
				name="altis-experiments"
				title={ __( 'Experiments', 'altis-experiments' ) }
			>
				<Panel>
					<PanelBody
						className={ classNames }
						title={ __( 'Post Titles', 'altis-experiments' ) }
						icon={ paused ? 'controls-pause' : 'chart-line' }
						initialOpen={ true }
					>
						{ ( winner !== false || hasEnded ) && (
							<Results />
						) }
						{ ( winner === false && ! hasEnded ) && (
							<Settings />
						) }
					</PanelBody>
				</Panel>
			</PluginSidebar>
		</Fragment>
	);
};

Plugin.defaultProps = {
	test: DEFAULT_TEST,
};

export default withTestData( Plugin );
