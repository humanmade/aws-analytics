import React, { Fragment } from 'react';

import {
	Button,
	CenteredButton,
	DestructivedButton,
	Duration,
	Notice,
	PanelRow,
	Warning,
} from './components';
import DateRangeField from './components/field-date-range';
import TitleTextField from './components/field-title-text';
import TrafficPercentageField from './components/field-traffic-percentage';
import { DEFAULT_TEST } from './data/shapes';
import withTestData from './data/with-test-data';
import { arrayEquals } from './utils';

const { __ } = wp.i18n;

/**
 * Titles A/B test settings form component.
 *
 * @param {React.ComponentProps} props The settings component props.
 * @returns {React.ReactNode} The A/B test settings form.
 */
const Settings = props => {
	const {
		isSaving,
		originalTitles,
		post,
		prevTitles,
		title,
		titles,
		test,
		setState,
		updateTest,
		updateTitles,
	} = props;
	const {
		paused,
		started,
		start_time: startTime,
		end_time: endTime,
		traffic_percentage: trafficPercentage,
		results,
	} = test;
	const {
		variants = [],
	} = results;

	// Set the initial prevTitles value if it's empty.
	if ( originalTitles.length && ! prevTitles.length ) {
		setState( { prevTitles: originalTitles } );
	}

	/**
	 * @param {boolean} paused True to pause the test.
	 */
	const setPaused = paused => {
		setState( { prevTitles: titles } );
		updateTest( { paused }, titles, true );
	};
	/**
	 * Start the test running.
	 */
	const startTest = () => {
		setState( { prevTitles: titles } );
		updateTest( {
			started: true,
			paused: false,
		}, titles, true );
	};
	/**
	 * Set the titles back to the values stored in the db.
	 */
	const resetTitles = () => {
		updateTitles( prevTitles );
	};

	const isActive = started && startTime <= Date.now() && endTime >= Date.now();

	return (
		<Fragment>
			<PanelRow>
				{ paused && (
					<Notice>{ __( 'Your test is paused', 'altis-experiments' ) }</Notice>
				) }
				{ isActive && ! paused && (
					<Notice>{ __( 'Your test is running', 'altis-experiments' ) }</Notice>
				) }
				{ ! paused && startTime >= Date.now() && (
					<Notice>
						{ __( 'Your test will start in' ) }
						{ ' ' }
						<Duration time={ startTime - Date.now() } />
					</Notice>
				) }
				{ started && (
					<CenteredButton
						disabled={ titles.length < 2 }
						isBusy={ isSaving }
						onClick={ () => {
							if ( arrayEquals( titles, prevTitles ) ) {
								return setPaused( ! paused );
							}

							if ( paused && window.confirm( __( 'Are you sure? Editing the titles will reset the current test results.', 'altis-experiments' ) ) ) {
								return setPaused( ! paused );
							}

							setPaused( ! paused );
						} }
					>
						{ paused && __( 'Resume test', 'altis-experiments' ) }
						{ ! paused && __( 'Pause test', 'altis-experiments' ) }
					</CenteredButton>
				) }
				{ ! started && (
					<CenteredButton
						disabled={ titles.length < 2 }
						isBusy={ isSaving }
						onClick={ startTest }
					>
						{ __( 'Run test', 'altis-experiments' ) }
					</CenteredButton>
				) }
				{ started && paused && ! arrayEquals( titles, prevTitles ) && (
					<Fragment>
						<Warning>
							{ __( 'Editing the titles now will reset the test and delete the previous results.' ) }
						</Warning>
						<Button
							isLink
							onClick={ resetTitles }
						>
							{ __( 'Undo changes', 'altis-experiments' ) }
						</Button>
					</Fragment>
				) }
			</PanelRow>
			<PanelRow>
				<p>{ __( 'Add multiple post titles and see which one has a higher conversion rate.', 'altis-experiments' ) }</p>
				<TitleTextField
					defaultTitle={ title }
					isEditable={ paused }
					postId={ post.id }
					titles={ titles }
					variants={ variants }
					onChange={ updateTitles }
				/>
			</PanelRow>
			<PanelRow>
				<TrafficPercentageField
					value={ trafficPercentage || 35 }
					onChange={ percent => updateTest( { traffic_percentage: percent } ) }
				/>
			</PanelRow>
			<PanelRow>
				<DateRangeField
					description={ __( 'The test will stop automatically when it reaches statistical significance.', 'altis-experiments' ) }
					endTime={ endTime || Date.now() + ( 30 * 24 * 60 * 60 * 1000 ) }
					startTime={ startTime || Date.now() }
					onChangeEnd={ time => updateTest( { end_time: time } ) }
					onChangeStart={ time => updateTest( { start_time: time } ) }
				/>
			</PanelRow>
			{ started && (
				<PanelRow>
					<DestructivedButton
						onClick={ () => {
							if ( window.confirm( __( 'Are you sure you want to cancel the test?', 'altis-experiments' ) ) ) {
								updateTest( {
									end_time: Date.now(),
								}, false, true );
							}
						} }
					>
						{ __( 'Cancel test', 'altis-experiments' ) }
					</DestructivedButton>
				</PanelRow>
			) }
		</Fragment>
	);
};

Settings.defaultProps = {
	test: DEFAULT_TEST,
};

export default withTestData( Settings );
