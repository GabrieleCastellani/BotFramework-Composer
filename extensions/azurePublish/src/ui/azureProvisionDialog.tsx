// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/** @jsx jsx */
import { jsx } from '@emotion/core';
import * as formatMessage from 'format-message';
import * as React from 'react';
import { useState, useMemo, useEffect, Fragment } from 'react';
import { Dropdown, IDropdownOption } from 'office-ui-fabric-react/lib/Dropdown';
import { DialogFooter } from 'office-ui-fabric-react/lib/Dialog';
import { DefaultButton, PrimaryButton } from 'office-ui-fabric-react/lib/Button';
import { TextField } from 'office-ui-fabric-react/lib/TextField';
import {
  currentProjectId,
  getAccessTokensFromStorage,
  startProvision,
  closeDialog,
  onBack,
  savePublishConfig,
  setTitle,
  getSchema,
} from '@bfc/extension-client';
import { Subscription } from '@azure/arm-subscriptions/esm/models';
import { ResourceGroup } from '@azure/arm-resources/esm/models';
import { DeployLocation } from '@bfc/types';
import {
  ScrollablePane,
  ScrollbarVisibility,
  ChoiceGroup,
  IChoiceGroupOption,
  DetailsList,
  DetailsListLayoutMode,
  IColumn,
  IGroup,
  CheckboxVisibility,
  Sticky,
  StickyPositionType,
  TooltipHost,
  Spinner,
} from 'office-ui-fabric-react';
import { JsonEditor } from '@bfc/code-editor';

import { getResourceList, getSubscriptions, getResourceGroups, getDeployLocations, getPreview } from './api';

const resourceTypes = ['Azure Web App', 'Cognitive Services'];

const publishType = 'azurePublish';

const choiceOptions: IChoiceGroupOption[] = [
  { key: 'create', text: 'Create new Azure resources' },
  { key: 'import', text: 'Import existing Azure resources' },
];
const PageTypes = {
  ConfigProvision: 'config',
  ReviewResource: 'review',
};
const DialogTitle = {
  CONFIG_RESOURCES: {
    title: formatMessage('Configure resources'),
    subText: formatMessage(
      'Composer will create your bot resources in this Azure destination. If you already have assets created then select import'
    ),
  },
  REVIEW: {
    title: formatMessage('Review + Create'),
    subText: formatMessage(
      'Please review the resources that will be created for your bot. Once these resources are provisioned, your resources will be available in your Azure profile'
    ),
  },
};

function onRenderDetailsHeader(props, defaultRender) {
  return (
    <Sticky isScrollSynced stickyPosition={StickyPositionType.Header}>
      {defaultRender({
        ...props,
        onRenderColumnHeaderTooltip: (tooltipHostProps) => <TooltipHost {...tooltipHostProps} />,
      })}
    </Sticky>
  );
}

export const AzureProvisionDialog: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [resourceGroups, setResourceGroups] = useState<ResourceGroup[]>([]);
  const [deployLocations, setDeployLocations] = useState<DeployLocation[]>([]);

  const [token, setToken] = useState<string>();
  const [graphToken, setGraphToken] = useState<string>();

  const [choice, setChoice] = useState(choiceOptions[0]);
  const [currentSubscription, setSubscription] = useState<Subscription>();
  const [currentHostName, setHostName] = useState('');
  const [errorHostName, setErrorHostName] = useState('');
  const [currentLocation, setLocation] = useState<DeployLocation>();
  const [extensionResourceOptions, setExtensionResourceOptions] = useState<any[]>([]);
  const [enabledResources, setEnabledResources] = useState({});

  const [isEditorError, setEditorError] = useState(false);
  const [importConfig, setImportConfig] = useState();

  const [page, setPage] = useState(PageTypes.ConfigProvision);
  const [group, setGroup] = useState<IGroup[]>();
  const [listItems, setListItem] = useState();

  const columns: IColumn[] = [
    {
      key: 'icon',
      name: 'File Type',
      iconName: 'Page',
      isIconOnly: true,
      fieldName: 'name',
      minWidth: 16,
      maxWidth: 16,
      onRender: (item: any) => {
        return <img src={item.icon} />;
      },
    },
    {
      key: 'Name',
      name: formatMessage('Name'),
      className: 'name',
      fieldName: 'name',
      minWidth: 70,
      isRowHeader: true,
      isResizable: true,
      data: 'string',
      onRender: (item: any) => {
        return <span>{item.name}</span>;
      },
      isPadded: true,
    },
    {
      key: 'Type',
      name: formatMessage('Type'),
      className: 'type',
      fieldName: 'type',
      minWidth: 70,
      isRowHeader: true,
      isResizable: true,
      data: 'string',
      onRender: (item: any) => {
        return <span>{item.text}</span>;
      },
      isPadded: true,
    },
    {
      key: 'Tier',
      name: formatMessage('Tier'),
      className: 'tier',
      fieldName: 'tier',
      minWidth: 70,
      isRowHeader: true,
      isResizable: true,
      data: 'string',
      onRender: (item: any) => {
        return <span>{item.tier}</span>;
      },
      isPadded: true,
    },
  ];

  useEffect(() => {
    setTitle(DialogTitle.CONFIG_RESOURCES);
    const { access_token, graph_token } = getAccessTokensFromStorage();
    setToken(access_token);
    setGraphToken(graph_token);
    getSubscriptions(access_token).then(setSubscriptions);
    getResources();
  }, []);

  const getResources = async () => {
    const resources = await getResourceList(currentProjectId(), publishType).catch((err) => {
      // todo: how do we handle API errors in this component
      console.log('ERROR', err);
    });
    setExtensionResourceOptions(resources);

    // set all of the resources to enabled by default.
    // in the future we may allow users to toggle some of them on and off
    const enabled = {};
    resources.forEach((resourceType) => {
      enabled[resourceType.key] = {
        enabled: true,
      };
    });
    setEnabledResources(enabled);
  };

  const subscriptionOption = useMemo(() => {
    console.log('GOT SUBSCRIPTIONS', subscriptions);
    return subscriptions.map((t) => ({ key: t.subscriptionId, text: t.displayName }));
  }, [subscriptions]);

  const deployLocationsOption = useMemo((): IDropdownOption[] => {
    return deployLocations.map((t) => ({ key: t.id, text: t.displayName }));
  }, [deployLocations]);

  const updateCurrentSubscription = useMemo(
    () => (_e, option?: IDropdownOption) => {
      const sub = subscriptions.find((t) => t.subscriptionId === option?.key);

      if (sub) {
        setSubscription(sub);
      }
    },
    [subscriptions]
  );

  const newResourceGroup = useMemo(
    () => (e, newName) => {
      // validate existed or not
      const existed = resourceGroups.find((t) => t.name === newName);
      if (existed) {
        setErrorHostName('this resource group already exist');
      } else {
        setErrorHostName('');
        setHostName(newName);
      }
    },
    [resourceGroups]
  );

  const updateCurrentLocation = useMemo(
    () => (_e, option?: IDropdownOption) => {
      const location = deployLocations.find((t) => t.id === option?.key);

      if (location) {
        setLocation(location);
      }
    },
    [deployLocations]
  );

  useEffect(() => {
    if (currentSubscription) {
      // get resource group under subscription
      getResourceGroups(token, currentSubscription.subscriptionId).then(setResourceGroups);
      getDeployLocations(token, currentSubscription.subscriptionId).then(setDeployLocations);
    }
  }, [currentSubscription]);

  const onNext = useMemo(
    () => (hostname) => {
      const names = getPreview(hostname);
      console.log('got names', names);
      const result = extensionResourceOptions.map((resource) => {
        const previewObject = names.find((n) => n.key === resource.key);
        return {
          ...resource,
          name: previewObject ? previewObject.name : `UNKNOWN NAME FOR ${resource.key}`,
          icon: previewObject ? previewObject.icon : undefined,
        };
      });

      // todo: generate list of resourceTypes based on what is in extensionResourceOptions
      console.log('WILL PROVISION THESE ITEMS', result);
      let items = [] as any;
      const groups: IGroup[] = [];
      let startIndex = 0;
      for (const type of resourceTypes) {
        const resources = result.filter(
          (item) => enabledResources[item.key] && enabledResources[item.key].enabled === true && item.group === type
        );

        groups.push({
          key: type,
          name: type,
          startIndex: startIndex,
          count: resources.length,
        });
        startIndex = startIndex + resources.length;
        items = items.concat(resources);
      }
      setGroup(groups);
      setListItem(items);
      setPage(PageTypes.ReviewResource);
      setTitle(DialogTitle.REVIEW);
    },
    [enabledResources]
  );

  const onSubmit = useMemo(
    () => async (options) => {
      console.log(options);
      // call back to the main Composer API to begin this process...
      startProvision(options);
      // TODO: close window
      closeDialog();
    },
    []
  );

  const onSave = useMemo(
    () => () => {
      console.log('inside', importConfig);
      savePublishConfig(importConfig);
      closeDialog();
    },
    [importConfig]
  );

  const updateChoice = useMemo(
    () => (ev, option) => {
      setChoice(option);
    },
    []
  );

  const isDisAble = useMemo(() => {
    return !currentSubscription || !currentHostName || errorHostName !== '';
  }, [currentSubscription, currentHostName, errorHostName]);

  const PageFormConfig = (
    <div style={{height: 'inherit'}}>
      <ChoiceGroup defaultSelectedKey="create" options={choiceOptions} onChange={updateChoice} />
      {subscriptionOption?.length > 0 && choice.key === 'create' && (
        <form style={{ width: '60%', height:'100%' }}>
          <Dropdown
            required
            defaultSelectedKey={currentSubscription?.subscriptionId}
            label={'Subscription'}
            options={subscriptionOption}
            placeholder={'Select your subscription'}
            onChange={updateCurrentSubscription}
          />
          <TextField
            required
            defaultValue={currentHostName}
            errorMessage={errorHostName}
            label={'HostName'}
            placeholder={'Name of your new resource group'}
            onChange={newResourceGroup}
          />
          <Dropdown
            required
            defaultSelectedKey={currentLocation?.id}
            label={'Locations'}
            options={deployLocationsOption}
            placeholder={'Select your location'}
            onChange={updateCurrentLocation}
          />
        </form>
      )}
      {choice.key === 'create' && subscriptionOption?.length < 1 && <Spinner label="Loading" />}
      {choice.key === 'import' && (
        <div style={{ width: '60%', marginTop: '10px', height: '100%' }}>
          <div>Publish Configuration</div>
          <JsonEditor
            id={publishType}
            height={200}
            styles={{ width: '60%' }}
            value={importConfig}
            onChange={(value) => {
              setEditorError(false);
              setImportConfig(value);
            }}
            schema={getSchema()}
            onError={() => {
              setEditorError(true);
            }}
          />
        </div>
      )}
    </div>
  );

  const PageReview = useMemo(() => {
    return (
      <div style={{height: 'inherit'}}>
        <ScrollablePane scrollbarVisibility={ScrollbarVisibility.auto}>
        <DetailsList
          isHeaderVisible
          checkboxVisibility={CheckboxVisibility.hidden}
          columns={columns}
          getKey={(item) => item.key}
          groups={group}
          items={listItems}
          layoutMode={DetailsListLayoutMode.justified}
          setKey="none"
          onRenderDetailsHeader={onRenderDetailsHeader}
        />
        </ScrollablePane>
      </div>
    );
  }, [group, listItems]);

  const PageFooter = useMemo(() => {
    if (page === PageTypes.ConfigProvision) {
      return (
        <DialogFooter>
          <DefaultButton text={'Back'} onClick={onBack} />
          {choice.key === 'create' ? (
            <PrimaryButton
              disabled={isDisAble}
              text="Next"
              onClick={() => {
                onNext(currentHostName);
              }}
            />
          ) : (
            <PrimaryButton disabled={isEditorError} text="Save" onClick={onSave} />
          )}
        </DialogFooter>
      );
    } else {
      return (
        <Fragment>
          <DialogFooter>
            <DefaultButton
              text={'Back'}
              onClick={() => {
                setPage(PageTypes.ConfigProvision);
                setTitle(DialogTitle.CONFIG_RESOURCES);
              }}
            />
            <PrimaryButton
              disabled={isDisAble}
              text={'Done'}
              onClick={async () => {
                await onSubmit({
                  subscription: currentSubscription,
                  hostname: currentHostName,
                  location: currentLocation,
                  type: publishType,
                  externalResources: extensionResourceOptions,
                });
              }}
            />
          </DialogFooter>
        </Fragment>
      );
    }
  }, [
    onSave,
    page,
    choice,
    isEditorError,
    isDisAble,
    currentSubscription,
    currentHostName,
    currentLocation,
    publishType,
    extensionResourceOptions,
  ]);

  return (
    <div style={{ height: '100vh' }}>
      {page === PageTypes.ConfigProvision ? PageFormConfig : PageReview}
      <div
        style={{
          background: '#FFFFFF',
          borderTop: '1px solid #000',
          position: 'sticky',
          bottom: '0',
          textAlign: 'right',
        }}
      >
        {PageFooter}
      </div>
    </div>
  );
};
