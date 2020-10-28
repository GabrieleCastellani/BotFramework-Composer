// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React from 'react';
import { act, fireEvent } from '@bfc/test-utils';

import { ExternalService } from '../../../src/pages/botProject/ExternalService';
import { renderWithRecoilAndCustomDispatchers } from '../../testUtils';
import { dispatcherState } from '../../../src/recoilModel';
import {
  settingsState,
  currentProjectIdState,
  projectMetaDataState,
  botProjectIdsState,
} from '../../../src/recoilModel';

const state = {
  projectId: 'test',
  settings: {},
  projectMetaDataState: {
    isRootBot: true,
    isRemote: false,
  },
  botProjectIdsState: ['test'],
};

describe('External Service', () => {
  it('should submit settings', () => {
    const setSettingsMock = jest.fn();
    const initRecoilState = ({ set }) => {
      set(currentProjectIdState, state.projectId);
      set(botProjectIdsState, state.botProjectIdsState);
      set(projectMetaDataState(state.projectId), state.projectMetaDataState);
      set(settingsState(state.projectId), state.settings);
      set(dispatcherState, {
        setSettings: setSettingsMock,
      });
    };
    const { getByTestId } = renderWithRecoilAndCustomDispatchers(
      <ExternalService projectId={state.projectId} />,
      initRecoilState
    );
    const textField1 = getByTestId('rootLUISKey');
    act(() => {
      fireEvent.change(textField1, {
        target: { value: 'myRootLUISKey' },
      });
    });
    expect(setSettingsMock).toBeCalledWith('test', {
      luis: {
        authoringKey: 'myRootLUISKey',
      },
    });
    const textField2 = getByTestId('rootLUISRegion');
    act(() => {
      fireEvent.change(textField2, {
        target: { value: 'myRootLUISRegion' },
      });
    });
    expect(setSettingsMock).toBeCalledWith('test', {
      luis: {
        authoringRegion: 'myRootLUISRegion',
      },
    });
    const textField3 = getByTestId('QnASubscriptionKey');
    act(() => {
      fireEvent.change(textField3, {
        target: { value: 'myQnASubscriptionKey' },
      });
    });
    expect(setSettingsMock).toBeCalledWith('test', {
      qna: {
        subscriptionKey: 'myQnASubscriptionKey',
      },
    });
  });
});
