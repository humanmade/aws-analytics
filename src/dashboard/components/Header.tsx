import { Button, DropdownMenu, MenuGroup, MenuItem } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import moment from 'moment';
import React, { useState } from 'react';
import { DateRangePicker, FocusedInputShape } from 'react-dates';

import { Duration, Filter, SelectableDate } from '../../util';

import './Header.css';

type FilterItemProps = {
	title: string,
	value: string,
	onRemove(): void,
}

const FilterItem = ( props: FilterItemProps ) => {
	return (
		<span className="Header__filter">
			<span className="Header__filter-text">
				<span className="Header__filter-type">{ props.title }</span>: { props.value }
			</span>
			<Button
				className="Header__filter-remover"
				icon={ <span className="dashicons dashicons-no" /> }
				label="Remove filter"
				onClick={ props.onRemove }
			/>
		</span>
	);
};

const TIME_FILTERS = {
	'P7D': __( 'Last 7 days', 'altis' ),
	'P14D': __( 'Last 14 days', 'altis' ),
	'P30D': __( 'Last 30 days', 'altis' ),
	'P1M': __( 'Last month', 'altis' ),
	'P60D': __( 'Last 60 days', 'altis' ),
	'P90D': __( 'Last 90 days', 'altis' ),
};

interface Props {
	filter: Filter,
	period: SelectableDate,
	onChangePeriod( period: SelectableDate ): void,
	onRefresh(): void,
	onUpdateFilter( filter: Filter ): void,
}

export default function Header( props: Props ) {
	const { filter, period, onUpdateFilter } = props;

	const [ focused, setFocused ] = useState<FocusedInputShape | null>( null );

	const now = new Date();

	const onSelectItem = ( period: SelectableDate, onClose: () => void ) => () => {
		onClose();
		props.onChangePeriod( period );
	};
	const onSelectCustom = ( onClose: () => void ) => () => {
		onClose();
		props.onChangePeriod( {
			start: moment( now ).startOf( 'week' ),
			end: moment( now ).endOf( 'day' )
		} );
	};

	const dropdownText = typeof period !== 'string' ? undefined : TIME_FILTERS[ period ];

	return (
		<header
			className="Header"
		>
			<DropdownMenu
				className="Header__duration-dropdown"
				label="Select date duration"
				icon="clock"
				// @ts-ignore
				text={ dropdownText }
			>
				{ ( { onClose } ) => (
					<>
						<MenuGroup>
							{ Object.entries( TIME_FILTERS ).map( ( [ duration, name ] ) => (
								<MenuItem
									key={ duration }
									onClick={ onSelectItem( duration as Duration, onClose ) }
								>
									{ name }
								</MenuItem>

							) ) }
						</MenuGroup>
						<MenuGroup>
							<MenuItem onClick={ onSelectCustom( onClose ) }>
								{ __( 'Custom range', 'altis' ) }
							</MenuItem>
						</MenuGroup>
					</>
				) }
			</DropdownMenu>
			{ typeof period !== 'string' && (
				<div className="Header__picker">
					<DateRangePicker
						displayFormat="MMM D, Y"
						hideKeyboardShortcutsPanel
						isOutsideRange={ date => date.isAfter( now, 'day' ) }
						minDate={ undefined }
						maxDate={ moment( now ) }
						startDate={ period.start }
						startDateId="header_period_start"
						endDate={ period.end }
						endDateId="header_period_end"
						small
						verticalSpacing={ 12 }
						weekDayFormat="ddd"
						onDatesChange={ ( { startDate, endDate } ) => {
							if ( ! startDate || ! endDate ) {
								return;
							}
							props.onChangePeriod( {
								start: startDate.startOf( 'day' ),
								end: endDate.endOf( 'day' ),
							} );
						} }
						focusedInput={ focused }
						onFocusChange={ setFocused }
					/>
				</div>
			) }
			<div className="Header__filters">
				{ filter.path && (
					<FilterItem
						title={ __( 'Path', 'altis' ) }
						value={ filter.path }
						onRemove={ () => onUpdateFilter( { ...filter, path: undefined } ) }
					/>
				) }
			</div>
			<div>
				<Button
					icon="update"
					onClick={ props.onRefresh }
				>
					{ __( 'Refresh', 'altis' ) }
				</Button>
			</div>
		</header>
	);
}
