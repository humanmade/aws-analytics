import React from 'react';

import { DEFAULT_TEST } from '../data/shapes';
import withTestData from '../data/with-test-data';

import Results from './results';
import Settings from './settings';

import { PanelBody } from '.';

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
		abTest,
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
	tests[ `${ abTest.id }_${ post.id }` ] = false;
	window.localStorage.setItem( '_altis_ab_tests', JSON.stringify( tests ) );

	return (
		<PanelBody
			className={ classNames }
			icon={ paused ? 'controls-pause' : 'chart-line' }
			initialOpen
			title={ abTest.title }
		>
			{ ( winner !== null || hasEnded ) && (
				<Results />
			) }
			{ ( winner === null && ! hasEnded ) && (
				<Settings />
			) }
		</PanelBody>
	);
};

TestPanel.defaultProps = {
	test: DEFAULT_TEST,
};

export default withTestData( TestPanel );
