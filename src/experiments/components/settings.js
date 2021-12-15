import React, { Fragment, useEffect } from 'react';

import { arrayEquals } from '../../utils';
import { DEFAULT_TEST } from '../data/shapes';
import withTestData from '../data/with-test-data';

import DateRangeField from './field-date-range';
import TrafficPercentageField from './field-traffic-percentage';
import VariantField from './variant-field';

import {
	Button,
	CenteredButton,
	DestructivedButton,
	Duration,
	Notice,
	PanelRow,
	Warning,
} from '.';

const { __ } = wp.i18n;

/**
 * A/B test settings form component.
 *
 * @param {React.ComponentProps} props The settings component props.
 * @returns {React.ReactNode} The A/B test settings form.
 */
const Settings = props => {
	const {
		experiment,
		isSaving,
		originalValues,
		post,
		prevValues,
		defaultValue,
		values,
		test,
		setState,
		updateTest,
		updateValues,
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

	// Set the initial prevValues value if it's empty.
	useEffect( () => {
		if ( originalValues.length && ! prevValues.length ) {
			setState( { prevValues: originalValues } );
		}
	}, [ originalValues, prevValues, setState ] );

	/**
	 * @param {boolean} paused True to pause the test.
	 */
	const setPaused = paused => {
		setState( { prevValues: values } );
		updateTest( { paused }, values, true );
	};
	/**
	 * Start the test running.
	 */
	const startTest = () => {
		setState( { prevValues: values } );
		updateTest( {
			started: true,
			paused: false,
		}, values, true );
	};
	/**
	 * Set the values back to the values stored in the db.
	 */
	const resetValues = () => {
		updateValues( prevValues );
	};

	const isActive = started && startTime <= Date.now() && endTime >= Date.now();

	return (
		<Fragment>
			<PanelRow>
				{ paused && (
					<Notice>{ __( 'Your test is paused', 'altis-analytics' ) }</Notice>
				) }
				{ isActive && ! paused && (
					<Notice>{ __( 'Your test is running', 'altis-analytics' ) }</Notice>
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
						disabled={ values.length < 2 }
						isBusy={ isSaving }
						onClick={ () => {
							if ( arrayEquals( values, prevValues ) ) {
								return setPaused( ! paused );
							}

							if ( paused && window.confirm( __( 'Are you sure? Editing the values will reset the current test results.', 'altis-analytics' ) ) ) {
								return setPaused( ! paused );
							}

							setPaused( ! paused );
						} }
					>
						{ paused && __( 'Resume test', 'altis-analytics' ) }
						{ ! paused && __( 'Pause test', 'altis-analytics' ) }
					</CenteredButton>
				) }
				{ ! started && (
					<CenteredButton
						disabled={ values.length < 2 }
						isBusy={ isSaving }
						onClick={ startTest }
					>
						{ __( 'Run test', 'altis-analytics' ) }
					</CenteredButton>
				) }
				{ started && paused && ! arrayEquals( values, prevValues ) && (
					<Fragment>
						<Warning>
							{ __( 'Editing the values now will reset the test and delete the previous results.' ) }
						</Warning>
						<Button
							isLink
							onClick={ resetValues }
						>
							{ __( 'Undo changes', 'altis-analytics' ) }
						</Button>
					</Fragment>
				) }
			</PanelRow>
			<PanelRow>
				<p>{ __( 'Add multiple values and see which one has a higher conversion rate.', 'altis-analytics' ) }</p>
				<VariantField
					defaultValue={ defaultValue }
					experiment={ experiment }
					isEditable={ paused }
					postId={ post.id }
					values={ values }
					variants={ variants }
					onChange={ updateValues }
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
					description={ __( 'The test will stop automatically when it reaches statistical significance.', 'altis-analytics' ) }
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
							if ( window.confirm( __( 'Are you sure you want to cancel the test?', 'altis-analytics' ) ) ) {
								updateTest( {
									end_time: Date.now(),
								}, false, true );
							}
						} }
					>
						{ __( 'Cancel test', 'altis-analytics' ) }
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
