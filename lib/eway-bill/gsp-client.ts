import { NICEWayBillPayload, EWayBillSettings } from './types';
import { logEWayBillAction } from '../db';
import { formatToNICDate, normalizeVehicleNumber } from './utils';

export interface GSPResponse {
  success: boolean;
  ewayBillNo?: string;
  ewayBillDate?: string;
  validUpto?: string;
  qrCode?: string;
  error?: string;
  rawResponse?: any;
  requiresManual?: boolean;
}

/**
 * Dispatches E-Way Bill generation request to GSP/NIC API
 */
export async function dispatchEWayBillGeneration(
  payload: NICEWayBillPayload,
  settings: EWayBillSettings
): Promise<GSPResponse> {
  const isConfigured = Boolean(
    settings.gsp_provider !== 'manual' &&
    settings.api_username &&
    settings.api_password &&
    settings.client_id
  );

  // If credentials are not configured or user selected manual provider
  if (!isConfigured) {
    return {
      success: false,
      requiresManual: true,
      error:
        'Official NIC / GSP API credentials are not configured. Use the 1-Click "Export NIC JSON" to generate on https://ewaybillgst.gov.in/ and record the official 12-digit EBN.',
    };
  }

  // Sandbox testing mode with simulated live government endpoint
  if (settings.environment === 'sandbox' || settings.gsp_provider === 'sandbox') {
    const mockEbn = '12' + Math.floor(1000000000 + Math.random() * 9000000000);
    const now = new Date();
    const distanceKm = parseInt(payload.transDistance, 10) || 20;
    const daysValid = Math.max(1, Math.ceil(distanceKm / 200));
    const validUntil = new Date(now.getTime() + daysValid * 24 * 60 * 60 * 1000);

    const mockResponse = {
      status_cd: '1',
      status_desc: 'E-Way Bill Generated Successfully in Sandbox Environment',
      data: {
        ewayBillNo: mockEbn,
        ewayBillDate: now.toISOString().replace('T', ' ').substring(0, 19),
        validUpto: validUntil.toISOString().replace('T', ' ').substring(0, 19),
        alert: null,
      },
    };

    logEWayBillAction('generate', null, payload, mockResponse, 'success');

    return {
      success: true,
      ewayBillNo: mockEbn,
      ewayBillDate: mockResponse.data.ewayBillDate,
      validUpto: mockResponse.data.validUpto,
      rawResponse: mockResponse,
    };
  }

  // Live GSP / NIC production endpoint integration
  try {
    const endpoint = 'https://api.ewaybillgst.gov.in/ewaybillapi/v1.03/ewayapi/genewb';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        client_id: settings.client_id || '',
        client_secret: settings.client_secret || '',
        gstin: settings.gstin || '',
        username: settings.api_username || '',
        auth_token: settings.auth_token || '',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (res.ok && data.status_cd === '1' && data.data?.ewayBillNo) {
      logEWayBillAction('generate', null, payload, data, 'success');
      return {
        success: true,
        ewayBillNo: String(data.data.ewayBillNo),
        ewayBillDate: data.data.ewayBillDate,
        validUpto: data.data.validUpto,
        rawResponse: data,
      };
    } else {
      const err = data.error_desc || data.message || 'Government portal rejected payload';
      logEWayBillAction('generate', null, payload, data, 'failure', err);
      return {
        success: false,
        error: err,
        rawResponse: data,
      };
    }
  } catch (err: any) {
    logEWayBillAction('generate', null, payload, null, 'failure', err.message);
    return {
      success: false,
      error: `Network error connecting to NIC gateway: ${err.message}`,
    };
  }
}

/**
 * Dispatches Vehicle update (Part-B) request to GSP/NIC API
 */
export async function dispatchVehicleUpdate(
  params: {
    ewbNo: string;
    vehicleNo: string;
    fromPlace: string;
    fromState: number;
    reasonCode: string;
    remarks: string;
    transDocNo?: string;
    transDocDate?: string;
  },
  settings: EWayBillSettings
): Promise<{ success: boolean; validUpto?: string; error?: string }> {
  const isConfigured = Boolean(
    settings.gsp_provider !== 'manual' &&
    settings.api_username &&
    settings.client_id
  );

  if (!isConfigured || settings.environment === 'sandbox') {
    // In manual or sandbox mode, vehicle update is saved locally directly
    return { success: true };
  }

  const payload = {
    ewbNo: parseInt(params.ewbNo.replace(/\D/g, ''), 10),
    vehicleNo: normalizeVehicleNumber(params.vehicleNo),
    fromPlace: params.fromPlace,
    fromState: params.fromState,
    reasonCode: params.reasonCode,
    reasonRem: params.remarks,
    transDocNo: params.transDocNo,
    transDocDate: params.transDocDate ? formatToNICDate(params.transDocDate) : undefined,
    transMode: '1',
  };

  try {
    const endpoint = 'https://api.ewaybillgst.gov.in/ewaybillapi/v1.03/ewayapi/vehupd';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        client_id: settings.client_id || '',
        client_secret: settings.client_secret || '',
        gstin: settings.gstin || '',
        username: settings.api_username || '',
        auth_token: settings.auth_token || '',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok && data.status_cd === '1') {
      logEWayBillAction('update_vehicle', null, payload, data, 'success');
      return { success: true, validUpto: data.data?.validUpto };
    }
    return { success: false, error: data.error_desc || data.message || 'Failed to update vehicle' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Dispatches Cancel request to GSP/NIC API
 */
export async function dispatchEWayBillCancel(
  params: {
    ewbNo: string;
    cancelRsnCode: number;
    cancelRmrk: string;
  },
  settings: EWayBillSettings
): Promise<{ success: boolean; error?: string }> {
  const isConfigured = Boolean(
    settings.gsp_provider !== 'manual' &&
    settings.api_username &&
    settings.client_id
  );

  if (!isConfigured || settings.environment === 'sandbox') {
    return { success: true };
  }

  const payload = {
    ewbNo: parseInt(params.ewbNo.replace(/\D/g, ''), 10),
    cancelRsnCode: params.cancelRsnCode,
    cancelRmrk: params.cancelRmrk,
  };

  try {
    const endpoint = 'https://api.ewaybillgst.gov.in/ewaybillapi/v1.03/ewayapi/canewb';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        client_id: settings.client_id || '',
        client_secret: settings.client_secret || '',
        gstin: settings.gstin || '',
        username: settings.api_username || '',
        auth_token: settings.auth_token || '',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok && data.status_cd === '1') {
      logEWayBillAction('cancel', null, payload, data, 'success');
      return { success: true };
    }
    return { success: false, error: data.error_desc || data.message || 'Failed to cancel E-Way Bill' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
