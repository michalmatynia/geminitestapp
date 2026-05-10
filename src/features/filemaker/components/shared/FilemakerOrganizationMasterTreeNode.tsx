'use client';

import React from 'react';

import {
  fromFilemakerOrganizationEventNodeId,
  fromFilemakerOrganizationJobListingNodeId,
  fromFilemakerOrganizationNodeId,
} from '../../entity-master-tree';
import type { FilemakerOrganization } from '../../types';
import { FilemakerOrganizationGroupNode } from './FilemakerOrganizationMasterTreeNode.group';
import { FilemakerOrganizationLeafNode } from './FilemakerOrganizationMasterTreeNode.leaf';
import {
  FilemakerOrganizationEventLinkNode,
  FilemakerOrganizationJobListingLinkNode,
} from './FilemakerOrganizationMasterTreeNode.relation';
import {
  metadataNumber,
  resolveOrganizationTreeNodeStateClassName,
  type FilemakerOrganizationTreeNodeProps,
} from './FilemakerOrganizationMasterTreeNode.shared';

const renderRelatedOrGroupNode = (
  props: FilemakerOrganizationTreeNodeProps,
  stateClassName: string
): React.JSX.Element => {
  const eventLink = fromFilemakerOrganizationEventNodeId(props.node.id);
  if (eventLink !== null) {
    return (
      <FilemakerOrganizationEventLinkNode
        depth={props.depth}
        event={props.eventsById.get(eventLink.eventId) ?? null}
        eventId={eventLink.eventId}
        node={props.node}
        onOpenEvent={props.onOpenEvent}
        select={props.select}
        stateClassName={stateClassName}
      />
    );
  }

  const jobListingLink = fromFilemakerOrganizationJobListingNodeId(props.node.id);
  if (jobListingLink !== null) {
    return (
      <FilemakerOrganizationJobListingLinkNode
        depth={props.depth}
        jobListing={props.jobListingsById.get(jobListingLink.jobListingId) ?? null}
        jobListingId={jobListingLink.jobListingId}
        node={props.node}
        onOpenJobListing={props.onOpenJobListing}
        organizationId={jobListingLink.organizationId}
        stateClassName={stateClassName}
      />
    );
  }

  return <FilemakerOrganizationGroupNode {...props} stateClassName={stateClassName} />;
};

const renderOrganizationLeafNode = (
  props: FilemakerOrganizationTreeNodeProps,
  organization: FilemakerOrganization,
  stateClassName: string
): React.JSX.Element => (
  <FilemakerOrganizationLeafNode
    depth={props.depth}
    eventCount={metadataNumber(props.node.metadata?.['eventCount'])}
    hasChildren={props.hasChildren}
    isEmailScrapeRunning={props.organizationEmailScrapeState[organization.id] === true}
    isExpanded={props.isExpanded}
    isSelectedForBatch={props.organizationSelection[organization.id] === true}
    isWebsiteSocialScrapeRunning={
      props.organizationWebsiteSocialScrapeState[organization.id] === true
    }
    jobListings={props.jobListingsByOrganizationId?.get(organization.id) ?? []}
    jobListingCount={metadataNumber(props.node.metadata?.['jobListingCount'])}
    organization={organization}
    stateClassName={stateClassName}
    onDeleteOrganization={props.onDeleteOrganization}
    onLaunchOrganizationEmailScrape={props.onLaunchOrganizationEmailScrape}
    onLaunchOrganizationWebsiteSocialScrape={props.onLaunchOrganizationWebsiteSocialScrape}
    onOpenOrganization={props.onOpenOrganization}
    onToggleOrganizationSelection={props.onToggleOrganizationSelection}
    toggleExpand={props.toggleExpand}
  />
);

export function FilemakerOrganizationMasterTreeNode(
  props: FilemakerOrganizationTreeNodeProps
): React.JSX.Element {
  const organizationId = fromFilemakerOrganizationNodeId(props.node.id);
  const organization =
    organizationId !== null ? (props.organizationById.get(organizationId) ?? null) : null;
  const stateClassName = resolveOrganizationTreeNodeStateClassName({
    isSelected: props.isSelected,
    isSearchMatch: props.isSearchMatch,
  });

  if (organization !== null) {
    return renderOrganizationLeafNode(props, organization, stateClassName);
  }
  return renderRelatedOrGroupNode(props, stateClassName);
}
