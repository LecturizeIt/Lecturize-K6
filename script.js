import http from "k6/http";
import { group, check, sleep } from "k6";

// TEST CONFIGURATIONS
export let options = {
  vus: 1, // NUMBER OF SIMULTANEOUS VIRTUAL USERS
  iterations: 1, // TOTAL NUMBER OF ITERATIONS
  // duration: "1m", // TOTAL TEST DURATION
};

// GLOBAL VARIABLES
let authToken = "";
const fileContent = open("/path/LecturizeIt.jpeg", "b");

// FUNCTION TO PERFORM AUTHENTICATION AND OBTAIN THE TOKEN
function authenticate() {
  let res = http.post(
    "http://localhost:8080/api/auth/login",
    JSON.stringify({
      email: "admin@admin.com",
      password: "1234",
    }),
    { headers: { "Content-Type": "application/json" } }
  );

  let logMessage = formatLogMessage("POST", "http://localhost:8080/api/auth/login", res);
  console.log(logMessage);

  check(res, {
    "authentication successful": (r) => r.status === 200,
  });

  if (res.status === 200) {
    let responseJson = res.json();
    authToken = responseJson.accessToken;
  } else {
    throw new Error("Authentication failed!");
  }
}

// FUNCTION TO GENERATE HEADERS WITH THE AUTHENTICATION TOKEN
function getAuthHeaders() {
  return {
    Authorization: `Bearer ${authToken}`,
    "Content-Type": "application/json",
  };
}

function getImageHeaders() {
  return {
    Authorization: `Bearer ${authToken}`,
    "Content-Type": "multipart/form-data",
  };
}

// FUNCTION TO CREATE AND RETURN THE REQUEST BODY
function createRequestBody(data) {
  return JSON.stringify(data);
}

// FUNCTION FORMATLOGMESSAGE: FORMATS THE LOG MESSAGE WITH COLORS FOR THE HTTP METHOD AND STATUS CODE. THE ANSI CODES USED ARE:

// \x1b[32m FOR GREEN (SUCCESS).
// \x1b[31m FOR RED (ERROR).
// \x1b[34m FOR BLUE (GET).
// \x1b[36m FOR CYAN (POST).
// \x1b[33m FOR YELLOW (PUT).
// \x1b[35m FOR MAGENTA (DELETE).
// \x1b[0m TO RESET THE COLOR.

// DETAILED LOGS: EACH LOG NOW INCLUDES THE REQUEST TYPE, STATUS CODE, AND DURATION, ALONG WITH A SNIPPET OF THE RESPONSE BODY.

// FUNCTION TO LOG HTTP REQUEST DETAILS
function formatLogMessage(method, url, res) {
  let statusColor = res.status >= 200 && res.status < 300 ? "\x1b[32m" : "\x1b[31m";
  let methodColor = method === "GET" ? "\x1b[34m" : method === "POST" ? "\x1b[36m" : method === "PUT" ? "\x1b[33m" : "\x1b[35m";

  return `${methodColor}${method}\x1b[0m ${url}: ${statusColor}${res.status}\x1b[0m | Duration: ${res.timings.duration}ms`;
}

export default function () {
  // AUTHENTICATES AND OBTAINS THE TOKEN BEFORE MAKING OTHER REQUESTS
  if (!authToken) {
    authenticate();
  }

  // EXECUTES TEST GROUPS
  group("Authentication", function () {
    let res = http.post(
      "http://localhost:8080/api/auth/register",
      createRequestBody({
        email: "user@user.com",
        username: "user",
        password: "1234",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
    console.log(formatLogMessage("POST", "http://localhost:8080/api/auth/register", res));

    res = http.post(
      "http://localhost:8080/api/auth/login",
      createRequestBody({
        email: "user@user.com",
        password: "1234",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
    console.log(formatLogMessage("POST", "http://localhost:8080/api/auth/login", res));

    res = http.get("http://localhost:8080/api/auth/user", {
      headers: getAuthHeaders(),
    });
    console.log(formatLogMessage("GET", "http://localhost:8080/api/auth/user", res));
  });

  group("Lectures", function () {
    let res = http.post(
      "http://localhost:8080/api/lectures",
      createRequestBody({
        title: "Title",
        lecturer: "Lecturer",
        description: "Description",
        startsAt: "2024-01-01T03:00:00-03:00",
        endsAt: "2024-01-01T06:00:00-03:00",
        type: "Type",
        url: "https://abc.com",
        tags: [{ id: 1 }, { id: 3 }],
      }),
      { headers: getAuthHeaders() }
    );
    console.log(formatLogMessage("POST", "http://localhost:8080/api/lectures", res));

    res = http.get("http://localhost:8080/api/lectures/2", {
      headers: getAuthHeaders(),
    });
    console.log(formatLogMessage("GET", "http://localhost:8080/api/lectures/2", res));

    res = http.put(
      "http://localhost:8080/api/lectures/1",
      createRequestBody({
        title: "Title",
        lecturer: "Lecturer",
        description: "Description",
        startsAt: "2024-01-01T03:00:00-03:00",
        endsAt: "2024-01-01T06:00:00-03:00",
        type: "Type",
        url: "https://abc.com",
        tags: [{ id: 1 }],
      }),
      { headers: getAuthHeaders() }
    );
    console.log(formatLogMessage("PUT", "http://localhost:8080/api/lectures/1", res));

    res = http.del("http://localhost:8080/api/lectures/1", null, {
      headers: getAuthHeaders(),
    });
    console.log(formatLogMessage("DELETE", "http://localhost:8080/api/lectures/1", res));
  });

  group("Lecture Image", function () {
    let res = http.get("http://localhost:8080/api/lectures/1/image", {
      headers: { Accept: "application/json" },
    });
    console.log(formatLogMessage("GET", "http://localhost:8080/api/lectures/1/image", res));

    res = http.put(
      "http://localhost:8080/api/lectures/2/image",
      {
        file: http.file(fileContent, "LecturizeIt.jpeg"),
        description: "Description",
      },
      { headers: getImageHeaders() }
    );
    console.log(formatLogMessage("PUT", "http://localhost:8080/api/lectures/2/image", res));

    res = http.del("http://localhost:8080/api/lectures/1/image", null, {
      headers: getAuthHeaders(),
    });
    console.log(formatLogMessage("DELETE", "http://localhost:8080/api/lectures/1/image", res));
  });

  group("TestAPI", function () {
    let res = http.get("http://localhost:8080/ip");
    console.log(formatLogMessage("GET", "http://localhost:8080/ip", res));
  });

  // ADD A DELAY BETWEEN GROUPS TO SIMULATE MORE REALISTIC BEHAVIOR
  sleep(1);
}
