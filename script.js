// GATT Device Information Service UUIDs
var DEVICE_INFO_SERVICE_UUID           = '0000180a-0000-1000-8000-00805f9b34fb';
var MANUFACTURER_NAME_STRING_CHRC_UUID = '00002a29-0000-1000-8000-00805f9b34fb';
var SERIAL_NUMBER_STRING_CHRC_UUID     = '00002a25-0000-1000-8000-00805f9b34fb';

// The currently displayed service and characteristics.
var deviceInfoService;
var manufacturerNameStringCharacteristic;
var serialNumberStringCharacteristic;

// A mapping from device addresses to device names for found devices that expose
// a Device Information service.
var deviceInfoDevicesMap = {};

/**
 * Updates the UI based on the selected service.
 * @param {chrome.bluetoothLowEnergy.Service} service The selected GATT service
 *     to display.
 */
function selectService(service) {
  // Hide or show the appropriate elements based on whether or not
  // |serviceId| is undefined.
  document.getElementById('no-devices-error').hidden = !!service;
  document.getElementById('device-info-fields').hidden = !service;

  clearAllFields();

  deviceInfoService = service;
  manufacturerNameStringCharacteristic = undefined;
  serialNumberStringCharacteristic = undefined;

  if (!service) {
    console.log('No service selected.');
    return;
  }

  console.log('GATT service selected: ' + service.instanceId);

  // Get the characteristics of the selected service.
  chrome.bluetoothLowEnergy.getCharacteristics(service.instanceId,
                                               function (chrcs) {
    if (chrome.runtime.lastError) {
      console.log(chrome.runtime.lastError.message);
      return;
    }

    // Make sure that the same service is still selected.
    if (service.instanceId != deviceInfoService.instanceId)
      return;

    if (chrcs.length == 0) {
      console.log('Service has no characteristics: ' + service.instanceId);
      return;
    }

    chrcs.forEach(function (chrc) {
      if (chrc.uuid == MANUFACTURER_NAME_STRING_CHRC_UUID) {
        console.log('Setting Manufacturer Name String Characteristic: ' +
                    chrc.instanceId);
        manufacturerNameStringCharacteristic = chrc;

        // Read the value of the characteristic once and store it.
        chrome.bluetoothLowEnergy.readCharacteristicValue(chrc.instanceId,
                                                          function (readChrc) {
          if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError.message);
            return;
          }

          // Make sure that the same characteristic is still selected.
          if (readChrc.instanceId !=
              manufacturerNameStringCharacteristic.instanceId)
            return;

          manufacturerNameStringCharacteristic = readChrc;
          updateManufacturerNameStringValue();
        });

        return;
      }

      if (chrc.uuid == SERIAL_NUMBER_STRING_CHRC_UUID) {
        console.log('Setting Serial Number String Characteristic: ' +
                    chrc.instanceId);
        serialNumberStringCharacteristic = chrc;

        // Read the value of the characteristic once and store it.
        chrome.bluetoothLowEnergy.readCharacteristicValue(chrc.instanceId,
                                                          function (readChrc) {
          if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError.message);
            return;
          }

          // Make sure that the same characteristic is still selected.
          if (readChrc.instanceId !=
              serialNumberStringCharacteristic.instanceId)
            return;

          serialNumberStringCharacteristic = readChrc;
          updateSerialNumberStringValue();
        });

        return;
      }
    });
  });
}

/**
 * Updates the Manufacturer Name String field based on the value of the
 * currently selected Manufacturer Name String characteristic.
 */
function updateManufacturerNameStringValue() {
  if (!manufacturerNameStringCharacteristic) {
    console.log('No Manufacturer Name String Characteristic selected');
    return;
  }

  // Since this function is called after a read request, the value should be
  // present if the read was successful but it may be undefined if the read
  // failed, so check here.
  if (!manufacturerNameStringCharacteristic.value) {
    console.log('No Manufacturer Name String value has been read');
    return;
  }

  var name = String.fromCharCode.apply(
      null,
      new Uint8Array(manufacturerNameStringCharacteristic.value));

  console.log('Manufacturer Name: ' + name);
  setManufacturerName('"' + name + '"');
}

/**
 * Updates the Serial Number String field based on the value of the
 * currently selected Serian Number String characteristic.
 */
function updateSerialNumberStringValue() {
  if (!serialNumberStringCharacteristic) {
    console.log('No Serial Number String Characteristic selected');
    return;
  }

  // Since this function is called after a read request, the value should be
  // present if the read was successful but it may be undefined if the read
  // failed, so check here.
  if (!serialNumberStringCharacteristic.value) {
    console.log('No Serial Number String value has been read');
    return;
  }

  var serialNumber = String.fromCharCode.apply(
      null,
      new Uint8Array(serialNumberStringCharacteristic.value));

  console.log('Serial Number: ' + serialNumber);
  setSerialNumber(serialNumber);
}

/**
 * Helper functions to set the values of Device Information UI fields.
 */
function setFieldValue(id, value) {
  var div = document.getElementById(id);
  div.innerHTML = '';
  div.appendChild(document.createTextNode((value === undefined) ? '-' : value));
}

function setManufacturerName(value) {
  setFieldValue('manufacturer-name-string', value);
}

function setSerialNumber(value) {
  setFieldValue('serial-number-string', value);
}

function clearAllFields() {
  setManufacturerName(undefined);
  setSerialNumber(undefined);
}

/**
 * Updates the dropdown menu based on the contents of |deviceInfoDevicesMap|.
 */
function updateDeviceSelector() {
  var deviceSelector = document.getElementById('device-selector');
  var placeHolder = document.getElementById('placeholder');
  var addresses = Object.keys(deviceInfoDevicesMap);

  deviceSelector.innerHTML = '';
  placeHolder.innerHTML = '';
  deviceSelector.appendChild(placeHolder);

  // Clear the drop-down menu.
  if (addresses.length == 0) {
    console.log('No devices found with "Device Information Service"');
    placeHolder.appendChild(document.createTextNode('No connected devices'));
    return;
  }

  // Hide the placeholder and populate
  placeHolder.appendChild(document.createTextNode('Connected devices found'));

  for (var i = 0; i < addresses.length; i++) {
    var address = addresses[i];
    var deviceOption = document.createElement('option');
    deviceOption.setAttribute('value', address);
    deviceOption.appendChild(document.createTextNode(
        deviceInfoDevicesMap[address]));
    deviceSelector.appendChild(deviceOption);
  }
}

/**
 * This is the entry point of the application. Initialize UI state and set up
 * the relevant Bluetooth Low Energy event listeners.
 */
function main() {
  // Set up the UI to look like no device was initially selected.
  selectService(undefined);

  // Initialize |deviceInfoDevicesMap|.
  chrome.bluetooth.getDevices(function (devices) {
    if (chrome.runtime.lastError) {
      console.log(chrome.runtime.lastError.message);
    }

    if (devices) {
      devices.forEach(function (device) {
        // See if the device exposes a Device Information service.
        chrome.bluetoothLowEnergy.getServices(device.address,
                                              function (services) {
          if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError.message);
            return;
          }

          if (!services)
            return;

          var found = false;
          services.forEach(function (service) {
            if (service.uuid == DEVICE_INFO_SERVICE_UUID) {
              console.log('Found Device Information service!');
              found = true;
            }
          });

          if (!found)
            return;

          console.log('Found device with Device Information service: ' +
                      device.address);
          deviceInfoDevicesMap[device.address] =
              (device.name ? device.name : device.address);

          updateDeviceSelector();
        });
      });
    }
  });

  // Set up the device selector.
  var deviceSelector = document.getElementById('device-selector');
  deviceSelector.onchange = function () {
    var selectedValue = deviceSelector[deviceSelector.selectedIndex].value;

    // If |selectedValue| is empty, unselect everything.
    if (!selectedValue) {
      selectService(undefined);
      return;
    }

    // Request all GATT services of the selected device to see if it still has
    // a Device Information service and pick the first one to display.
    chrome.bluetoothLowEnergy.getServices(selectedValue, function (services) {
      if (chrome.runtime.lastError) {
        console.log(chrome.runtime.lastError.message);
        selectService(undefined);
        return;
      }

      var foundService = undefined;
      services.forEach(function (service) {
        if (service.uuid == DEVICE_INFO_SERVICE_UUID)
          foundService = service;
      });

      selectService(foundService);
    });
  };

  // Track GATT services as they are added.
  chrome.bluetoothLowEnergy.onServiceAdded.addListener(function (service) {
    // Ignore, if the service is not a Device Information service.
    if (service.uuid != DEVICE_INFO_SERVICE_UUID)
      return;

    // Add the device of the service to the device map and update the UI.
    console.log('New Device Information service added: ' + service.instanceId);
    if (deviceInfoDevicesMap.hasOwnProperty(service.deviceAddress))
      return;

    // Looks like it's a brand new device. Get information about the device so
    // that we can display the device name in the drop-down menu.
    chrome.bluetooth.getDevice(service.deviceAddress, function (device) {
      if (chrome.runtime.lastError) {
        console.log(chrome.runtime.lastError.message);
        return;
      }

      deviceInfoDevicesMap[device.address] =
          (device.name ? device.name : device.address);
      updateDeviceSelector();
    });
  });

  // Track GATT services as they are removed.
  chrome.bluetoothLowEnergy.onServiceRemoved.addListener(function (service) {
    // Ignore, if the service is not a Device Information service.
    if (service.uuid != DEVICE_INFO_SERVICE_UUID)
      return;

    // See if this is the currently selected service. If so, unselect it.
    console.log('Device Information service removed: ' + service.instanceId);
    if (deviceInfoService && deviceInfoService.instanceId == service.instanceId) {
      console.log('The selected service disappeared!');
      selectService(undefined);
    }

    // Remove the associated device from the map only if it has no other Device
    // Information services exposed (this will usually be the case)
    if (!deviceInfoDevicesMap.hasOwnProperty(service.deviceAddress))
      return;

    chrome.bluetooth.getDevice(service.deviceAddress, function (device) {
      if (chrome.runtime.lastError) {
        console.log(chrome.runtime.lastError.message);
        return;
      }

      chrome.bluetoothLowEnergy.getServices(device.address,
                                            function (services) {
        if (chrome.runtime.lastError) {
          // Error obtaining services. Remove the device from the map.
          console.log(chrome.runtime.lastError.message);
          delete deviceInfoDevicesMap[device.address];
          updateDeviceSelector();
          return;
        }

        var found = false;
        for (var i = 0; i < services.length; i++) {
          if (services[i].uuid == DEVICE_INFO_SERVICE_UUID) {
            found = true;
            break;
          }
        }

        if (found)
          return;

        console.log('Removing device: ' + device.address);
        delete deviceInfoDevicesMap[device.address];
        updateDeviceSelector();
      });
    });
  });

  // Track GATT services as they change.
  chrome.bluetoothLowEnergy.onServiceChanged.addListener(function (service) {
    // This only matters if the selected service changed.
    if (!deviceInfoService || service.instanceId != deviceInfoService.instanceId)
      return;

    console.log('The selected service has changed');

    // Reselect the service to force an updated.
    selectService(service);
  });
}

document.addEventListener('DOMContentLoaded', main);
