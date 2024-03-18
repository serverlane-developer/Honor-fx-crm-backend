#!/bin/bash

file_contents=$(cat ./.env)

# echo $file_contents

mapfile -t array <<<"$file_contents"

# echo "${array}"

sample_env_string=""

for i in "${array[@]}"; do
  # echo "$i"

  line_key=${i%=*}
  if [ -n "$line_key" ]; then
    sample_env_string+=$line_key=
  fi
  sample_env_string+=$'\n'
done

# echo "$sample_env_string"
echo "$sample_env_string" > ./.env.example

echo ".env.example has been created"


: '

# Sample CODE for JS

const fs = require("fs");
const envPath = "./.env";
const envSamplePath = "./.env.example";

const envFile = fs.readFileSync(envPath, "utf-8");
const envArray = envFile.split("\n");

const getKey = (line = "") => {
  const key = line.split("=")[0];
  if (key) return `${key}=`;
  return key;
};
const mappedfile = envArray.map(getKey);
const envKeys = mappedfile.join("\n");

fs.writeFileSync(envSamplePath, envKeys);
'