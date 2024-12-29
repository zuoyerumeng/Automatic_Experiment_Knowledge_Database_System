import json
from neo4j import GraphDatabase

# Define the Neo4j connection details
uri = "bolt://localhost:7687"
user = "neo4j"
password = "jiang6"

# Define the JSON file path
json_file_path = "uploads/knowledge.json"


# Function to create nodes and relationships in Neo4j
def create_graph(tx, data):
    for item in data:
        if "source" in item["data"]:
            # This is a relationship
            tx.run(
                """
                MATCH (source:Node {id: $source})
                MATCH (target:Node {id: $target})
                MERGE (source)-[:%s {label: $label}]->(target)
                """
                % item["data"]["label"].replace(" ", "_"),
                source=item["data"]["source"],
                target=item["data"]["target"],
                label=item["data"]["label"],
            )
        else:
            # This is a node
            tx.run(
                "MERGE (n:Node {id: $id}) SET n.label = $label, n.type = $type",
                id=item["data"]["id"],
                label=item["data"]["label"],
                type=item["data"]["type"],
            )


# Read the JSON data
with open(json_file_path, "r", encoding="utf-8") as file:
    data = json.load(file)

# Connect to Neo4j and create the graph
driver = GraphDatabase.driver(uri, auth=(user, password))
with driver.session() as session:
    session.execute_write(create_graph, data)

driver.close()
