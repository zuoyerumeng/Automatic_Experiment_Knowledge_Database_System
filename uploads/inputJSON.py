import json
from neo4j import GraphDatabase

# Define the Neo4j connection details
uri = "bolt://localhost:7687"
user = "neo4j"
password = "jiang6"

# Define the JSON file path
json_file_path = "uploads/steps.json"


# Function to create nodes and relationships in Neo4j
def create_graph(tx, data):
    # Create a node for the root category
    tx.run("MERGE (r:Experiment {name: $experiment})", experiment=data["Experiment"])

    for item in data["Steps"]:
        # Create a node for the step category
        tx.run(
            "MERGE (c:Category {name: $category})",
            category=item["category"],
        )

        # Create relationships between every category and the root category
        tx.run(
            "MATCH (c:Category {name: $category}) "
            "MATCH (r:Experiment {name: $experiment}) "
            "MERGE (r)-[:HAS_STEP]->(c)",
            category=item["category"],
            experiment=data["Experiment"],
        )

        # Create a node for each step
        tx.run(
            "CREATE (s:Step {name: $name, step_number: $step_number, description: $description})",
            name=item["name"],
            step_number=item["step_number"],
            description=item["description"],
            # details=item["details"] if item["details"] else {},
        )

        # Create relationships between the step and the category
        tx.run(
            "MATCH (s:Step {name: $step_name}) "
            "MATCH (c:Category {name: $category}) "
            "MERGE (c)-[:HAS_STEP]->(s)",
            step_name=item["name"],
            category=item["category"],
        )

        # Create nodes for actions and relationships to the step
        for action in item["actions"]:
            tx.run(
                "MERGE (a:Action {name: $action, step_name: $step_name}) "
                "WITH a "
                "MATCH (s:Step {name: $step_name}) "
                "MERGE (s)-[:HAS_ACTION]->(a)",
                action=action,
                step_name=item["name"],
            )

        # # Create nodes for details and relationships to the step
        # for key, value in item["details"].items():
        #     tx.run(
        #         "MERGE (d:Detail {key: $key, value: $value}) "
        #         "WITH d "
        #         "MATCH (s:Step {name: $step_name}) "
        #         "MERGE (s)-[:HAS_DETAIL]->(d)",
        #         key=key,
        #         value=value,
        #         step_name=item["name"],
        #     )


# Read the JSON data
with open(json_file_path, "r", encoding="utf-8") as file:
    data = json.load(file)

# Connect to Neo4j and create the graph
driver = GraphDatabase.driver(uri, auth=(user, password))
with driver.session() as session:
    session.execute_write(create_graph, data)

driver.close()
