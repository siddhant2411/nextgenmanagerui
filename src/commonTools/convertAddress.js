const convertAddressToString = (addressObject) => {

    const addressString = addressObject.street1 + ", " + addressObject.street2 + (addressObject.pinCode ? "-" + addressObject.pinCode : '') + ", " +
        addressObject.state + ", " + addressObject.country

    return addressString

}

export default convertAddressToString;