import React from 'react';
import styled from 'styled-components';

const { __ } = wp.i18n;

const StyledTimeline = styled.div`
    margin: 20px 0;
`;

/**
 * Timeline component for A/B tests.
 *
 * @param {Date} start Test start date.
 * @param {Date} end Test end date.
 * @returns
 */
const Timeline = ( {
    start,
    end,
} ) => {
    return (
        <StyledTimeline className="altis-analytics-timeline">
            <h3 className="screen-reader-text">{ __( 'Timeline', 'altis-analytics' ) }</h3>
            <p className="altis-analytics-timeline__date altis-analytics-timeline__date--start"></p>
            <p className="altis-analytics-timeline__date altis-analytics-timeline__date--end"></p>
        </StyledTimeline>
    );
};

export default Timeline;
