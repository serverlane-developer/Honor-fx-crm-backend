const password = new RegExp(/^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,20}$/);
const email = new RegExp(
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
);
const phone = new RegExp(/^([+\d].*)?\d$/);
const number = new RegExp(/^[0-9]+$/);
const username = new RegExp(/^[a-zA-Z0-9!@#$%^&*)(]{2,20}$/);
const name = new RegExp(/[a-zA-Z]+/);
const address = new RegExp(/^[#.0-9a-zA-Z\s,-]+$/);
const awsRegion = new RegExp(
  /^(us(-gov)?-east-1|us(-gov)?-east-2|us(-gov)?-west-1|us(-gov)?-west-2|af-south-1|ap-east-1|ap-northeast-1|ap-northeast-2|ap-northeast-3|ap-south-1|ap-southeast-1|ap-southeast-2|ca-central-1|cn-north-1|cn-northwest-1|eu-central-1|eu-north-1|eu-south-1|eu-west-1|eu-west-2|eu-west-3|me-south-1|sa-east-1|us-gov-east-1|us-gov-west-1)$/
);

const regex = {
  password,
  email,
  phone,
  number,
  username,
  name,
  address,
  awsRegion,
};

export default regex;
