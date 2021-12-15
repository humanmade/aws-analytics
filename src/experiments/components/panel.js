import React from 'react';

import { Panel } from '.';
import { DEFAULT_TEST } from '../data/shapes';
import withTestData from '../data/with-test-data';
import Results from './results';
import Settings from './settings';

const { PanelBody } = wp.components;

/**
 * Block Editor sidebar panel component for A/B tests.
 *
 * @param {React.ComponentProps} props The sidebar panel component props.
 * @returns {React.ReactNode} The plugin sidebar panel.
 */
const TestPanel = props => {
	const {
		post,
		test,
		testId,
		title,
	} = props;
	const {
		started,
		paused,
		results,
		end_time: endTime,
	} = test;
	const { winner = null } = results;

	const classNames = [
		started && 'is-started',
		paused && 'is-paused',
	].filter( Boolean ).join( ' ' );

	const hasEnded = endTime < Date.now();

	// Opt the editing user out of the test.
	// This effectively resets their variant after previewing.
	const tests = JSON.parse( window.localStorage.getItem( '_altis_ab_tests' ) || '{}' );
	tests[ `${ testId }_${ post.id }` ] = false;
	window.localStorage.setItem( '_altis_ab_tests', JSON.stringify( tests ) );

	return (
		<Panel>
			<PanelBody
				className={ classNames }
				icon={ paused ? 'controls-pause' : 'chart-line' }
				initialOpen
				title={ title }
			>
				{ ( winner !== null || hasEnded ) && (
					<Results testId={ testId } />
				) }
				{ ( winner === null && ! hasEnded ) && (
					<Settings testId={ testId } />
				) }
			</PanelBody>
		</Panel>
	);
};

TestPanel.defaultProps = {
	test: DEFAULT_TEST,
};

export default withTestData( TestPanel );
